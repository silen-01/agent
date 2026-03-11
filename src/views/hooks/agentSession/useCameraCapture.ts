import { useState, useEffect, useRef } from "react";
import type { ILiveSession } from "../../../api/index.ts";
import { language } from "@modules";
import { blobToBase64 } from "../../../api/utils/audioUtils.ts";

/** Те же настройки, что и для трансляции экрана. */
export type CameraFacingMode = "user" | "environment";

export type CameraCaptureSettings = {
  width: number;
  height: number;
  jpegQuality: number;
  fps: number;
  motionThreshold: number;
  facingMode: CameraFacingMode;
};

export type UseCameraCaptureParams = {
  session: ILiveSession;
  sessionReady: boolean;
  cameraOn: boolean;
  setCameraOn: (value: boolean | ((prev: boolean) => boolean)) => void;
  cameraCaptureSettings: CameraCaptureSettings;
  onError?: (message: string) => void;
};

/**
 * Захват камеры и отправка кадров в сессию ИИ (video → canvas → JPEG → sendRealtimeInput).
 * Включается при cameraOn === true; при reconnect удерживает stream и ждёт восстановления sessionReady.
 */
export function useCameraCapture({
  session,
  sessionReady,
  cameraOn,
  setCameraOn,
  cameraCaptureSettings,
  onError,
}: UseCameraCaptureParams) {
  const { t } = language.useLanguage();
  const sessionRef = useRef(session);
  const sessionReadyRef = useRef(sessionReady);
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);
  const setCameraOnRef = useRef(setCameraOn);
  const cameraCaptureSettingsRef = useRef(cameraCaptureSettings);
  useEffect(() => {
    sessionRef.current = session;
    sessionReadyRef.current = sessionReady;
    onErrorRef.current = onError;
    tRef.current = t;
    setCameraOnRef.current = setCameraOn;
    cameraCaptureSettingsRef.current = cameraCaptureSettings;
  }, [session, sessionReady, onError, t, setCameraOn, cameraCaptureSettings]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingFrameRef = useRef(false);
  const cameraFacingMode = cameraCaptureSettings.facingMode ?? "user";

  const openCameraStream = async (facingMode: CameraFacingMode, width: number, height: number, fps: number) => {
    const baseConstraints = {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: Math.min(10, fps) },
    } satisfies MediaTrackConstraints;

    const attempts: MediaTrackConstraints[] = [
      { ...baseConstraints, facingMode: { exact: facingMode } },
      { ...baseConstraints, facingMode: { ideal: facingMode } },
      baseConstraints,
    ];

    let lastError: unknown = null;
    for (const video of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video });
      } catch (err) {
        lastError = err;
        if (
          err instanceof DOMException &&
          (err.name === "NotFoundError" || err.name === "OverconstrainedError")
        ) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const canvasRef = { current: null as HTMLCanvasElement | null };
    const ctxRef = { current: null as CanvasRenderingContext2D | null };
    const sampleCtxRef = { current: null as CanvasRenderingContext2D | null };

    const cleanup = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      canvasRef.current = null;
      ctxRef.current = null;
      sampleCtxRef.current = null;
      cameraStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
        cameraVideoRef.current = null;
      }
    };

    if (!cameraOn) {
      cleanup();
      return;
    }

    let cancelled = false;
    const sampleSize = 16;
    const numPixels = sampleSize * sampleSize;
    let prevLumas: Uint8Array | null = null;
    const settings = () => cameraCaptureSettingsRef.current;

    const scheduleNext = () => {
      if (cancelled) return;
      const { fps } = settings();
      timeoutId = setTimeout(tick, 1000 / Math.max(0.5, Math.min(10, fps)));
    };

    const tick = () => {
      if (cancelled || !cameraVideoRef.current || isProcessingFrameRef.current) return;
      const v = cameraVideoRef.current;
      if (v.readyState < 2) {
        scheduleNext();
        return;
      }
      const currentSession = sessionRef.current;
      if (!currentSession || !sessionReadyRef.current) {
        scheduleNext();
        return;
      }
      const { width, height, jpegQuality, motionThreshold = 0 } = settings();
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const sampleCtx = sampleCtxRef.current;
      if (!canvas || !ctx || !sampleCtx) {
        scheduleNext();
        return;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(v, 0, 0, width, height);

      if (motionThreshold > 0) {
        sampleCtx.drawImage(canvas, 0, 0, width, height, 0, 0, sampleSize, sampleSize);
        const data = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data;
        const curLumas = new Uint8Array(numPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          curLumas[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
        }
        if (prevLumas !== null) {
          let sumDiff = 0;
          for (let i = 0; i < numPixels; i++) sumDiff += Math.abs(curLumas[i] - prevLumas[i]);
          const meanDiff = sumDiff / numPixels / 255;
          prevLumas = curLumas;
          if (meanDiff < motionThreshold) {
            scheduleNext();
            return;
          }
        } else {
          prevLumas = curLumas;
        }
      }

      isProcessingFrameRef.current = true;
      canvas.toBlob(
        async (blob) => {
          try {
            const activeSession = sessionRef.current;
            if (
              blob &&
              !cancelled &&
              cameraStreamRef.current &&
              activeSession &&
              sessionReadyRef.current
            ) {
              const base64 = await blobToBase64(blob);
              activeSession.sendRealtimeInput({ media: { data: base64, mimeType: "image/jpeg" } });
            }
          } catch (e) {
            console.warn("Camera frame send failed:", e);
          } finally {
            isProcessingFrameRef.current = false;
          }
          scheduleNext();
        },
        "image/jpeg",
        jpegQuality
      );
    };

    const start = async () => {
      try {
        const stream = await openCameraStream(
          settings().facingMode ?? "user",
          settings().width,
          settings().height,
          settings().fps
        );
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraStream(stream);

        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setCameraOnRef.current(false);
          };
        });

        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        cameraVideoRef.current = video;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        canvasRef.current = canvas;
        ctxRef.current = ctx;

        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = sampleSize;
        sampleCanvas.height = sampleSize;
        const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
        if (!sampleCtx) return;
        sampleCtxRef.current = sampleCtx;

        scheduleNext();
      } catch (err) {
        if (!cancelled) {
          setCameraOnRef.current(false);
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? tRef.current("cameraErrorPermission")
              : err instanceof Error
                ? err.message
                : tRef.current("cameraErrorGeneric");
          onErrorRef.current?.(msg);
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [cameraOn, cameraFacingMode]);

  return { cameraStream };
}
