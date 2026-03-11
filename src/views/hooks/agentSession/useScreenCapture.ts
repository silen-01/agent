import { useState, useEffect, useRef, useCallback } from "react";
import type { ILiveSession } from "../../../api/index.ts";
import { language, constants } from "@modules";
import { blobToBase64 } from "../../../api/utils/audioUtils.ts";
import { isScreenShareAvailable } from "../../screenShareSupport.ts";

export type ScreenCaptureSettings = {
  width: number;
  height: number;
  jpegQuality: number;
  fps: number;
  motionThreshold: number;
};

export type UseScreenCaptureParams = {
  session: ILiveSession;
  sessionReady: boolean;
  initialScreenSharing?: boolean;
  onError?: (message: string) => void;
};

export function useScreenCapture({
  session,
  sessionReady,
  initialScreenSharing = false,
  onError,
}: UseScreenCaptureParams) {
  const { t } = language.useLanguage();
  const screenShareAvailable = isScreenShareAvailable();
  const [screenSharingState, setScreenSharingState] = useState(
    () => initialScreenSharing && screenShareAvailable
  );
  const [screenCaptureSettings, setScreenCaptureSettings] = useState<ScreenCaptureSettings>(
    () => ({ ...constants.session.screenCapture })
  );
  const setScreenSharing = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (!screenShareAvailable) {
        setScreenSharingState(false);
        return;
      }
      setScreenSharingState(value);
    },
    [screenShareAvailable]
  );
  const screenSharing = screenShareAvailable ? screenSharingState : false;

  const sessionRef = useRef(session);
  const sessionReadyRef = useRef(sessionReady);
  const screenCaptureSettingsRef = useRef<ScreenCaptureSettings>(screenCaptureSettings);
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);
  const setScreenSharingRef = useRef(setScreenSharing);
  useEffect(() => {
    sessionRef.current = session;
    sessionReadyRef.current = sessionReady;
    screenCaptureSettingsRef.current = screenCaptureSettings;
    onErrorRef.current = onError;
    tRef.current = t;
    setScreenSharingRef.current = setScreenSharing;
  }, [session, sessionReady, screenCaptureSettings, onError, t, setScreenSharing]);

  useEffect(() => {
    if (!screenShareAvailable) {
      setScreenSharingState(false);
    }
  }, [screenShareAvailable]);

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingFrameRef = useRef(false);

  // Трансляция экрана в ИИ: getDisplayMedia → video → canvas → JPEG → sendRealtimeInput(media)
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
      screenStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
        screenVideoRef.current = null;
      }
    };

    if (!screenShareAvailable || !screenSharing) {
      cleanup();
      return;
    }

    let cancelled = false;
    const sampleSize = 16;
    const numPixels = sampleSize * sampleSize;
    let prevLumas: Uint8Array | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      const { fps } = screenCaptureSettingsRef.current;
      timeoutId = setTimeout(tick, 1000 / Math.max(0.5, Math.min(10, fps)));
    };

    const tick = () => {
      if (cancelled || !screenVideoRef.current || isProcessingFrameRef.current) return;
      const v = screenVideoRef.current;
      if (v.readyState < 2) {
        scheduleNext();
        return;
      }
      const currentSession = sessionRef.current;
      if (!currentSession || !sessionReadyRef.current) {
        scheduleNext();
        return;
      }
      const { width, height, jpegQuality, motionThreshold = 0 } = screenCaptureSettingsRef.current;
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
              screenStreamRef.current &&
              activeSession &&
              sessionReadyRef.current
            ) {
              const base64 = await blobToBase64(blob);
              activeSession.sendRealtimeInput({ media: { data: base64, mimeType: "image/jpeg" } });
            }
          } catch (e) {
            console.warn("Screen frame send failed:", e);
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
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 10, width: 1280, height: 720 },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        screenStreamRef.current = stream;
        setScreenStream(stream);

        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setScreenSharingRef.current(false);
          };
        });

        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        screenVideoRef.current = video;

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
          setScreenSharingRef.current(false);
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? tRef.current("screenShareErrorPermission")
              : err instanceof Error
                ? err.message
                : tRef.current("screenShareErrorGeneric");
          onErrorRef.current?.(msg);
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [screenShareAvailable, screenSharing]);

  return {
    screenSharing,
    screenShareAvailable,
    setScreenSharing,
    screenStream,
    screenCaptureSettings,
    setScreenCaptureSettings,
  };
}
