import { useState, useEffect, useRef } from "react";
import type { ILiveSession } from "../../../api/index.ts";
import { language } from "@modules";
import { blobToBase64 } from "../../../api/utils/audioUtils.ts";

/** Те же настройки, что и для трансляции экрана. */
export type CameraCaptureSettings = {
  width: number;
  height: number;
  jpegQuality: number;
  fps: number;
  motionThreshold: number;
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
 * Включается при cameraOn === true и sessionReady; при ошибке доступа вызывает onError и выключает камеру.
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
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);
  const setCameraOnRef = useRef(setCameraOn);
  const cameraCaptureSettingsRef = useRef(cameraCaptureSettings);
  useEffect(() => {
    onErrorRef.current = onError;
    tRef.current = t;
    setCameraOnRef.current = setCameraOn;
    cameraCaptureSettingsRef.current = cameraCaptureSettings;
  }, [onError, t, setCameraOn, cameraCaptureSettings]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingFrameRef = useRef(false);

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

    if (!session || !sessionReady || !cameraOn) {
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
            if (blob && !cancelled && cameraStreamRef.current) {
              const base64 = await blobToBase64(blob);
              session.sendRealtimeInput({ media: { data: base64, mimeType: "image/jpeg" } });
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: settings().width },
            height: { ideal: settings().height },
            frameRate: { ideal: Math.min(10, settings().fps) },
          },
        });
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
  }, [session, sessionReady, cameraOn, cameraCaptureSettings]);

  return { cameraStream };
}
