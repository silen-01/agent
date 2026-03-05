import { useState, useCallback, useEffect, useRef } from "react";
import type { ILiveSession } from "../../api/index.ts";
import { language, constants } from "@modules";
import { createPcmBlob, PCM_SAMPLE_RATE, blobToBase64 } from "../../api/utils/audioUtils.ts";

function getDefaultDialogPos() {
  const { bottomPanelOffsetPx, panelMarginPx, defaultDialogSizePx } = constants.session;
  if (typeof window === "undefined") return { x: panelMarginPx, y: 200 };
  return {
    x: panelMarginPx,
    y: window.innerHeight - defaultDialogSizePx.height - bottomPanelOffsetPx,
  };
}

function getDefaultMemoryPos() {
  const { bottomPanelOffsetPx, panelMarginPx, defaultMemorySizePx } = constants.session;
  if (typeof window === "undefined") return { x: 400, y: 200 };
  return {
    x: window.innerWidth - defaultMemorySizePx.width - panelMarginPx,
    y: window.innerHeight - defaultMemorySizePx.height - bottomPanelOffsetPx,
  };
}

export type ScreenCaptureSettings = {
  width: number;
  height: number;
  jpegQuality: number;
  fps: number;
  motionThreshold: number;
};

export type UseAgentSessionParams = {
  session: ILiveSession;
  sessionReady: boolean;
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  onMicError?: (message: string) => void;
};

export function useAgentSession({
  session,
  sessionReady = false,
  initialMicOn = true,
  initialScreenSharing = false,
  onMicError,
}: UseAgentSessionParams) {
  const { t } = language.useLanguage();

  const [micOn, setMicOn] = useState(initialMicOn);
  const [screenSharing, setScreenSharing] = useState(initialScreenSharing);
  const [cameraOn, setCameraOn] = useState(false);
  const [micLevelPercent, setMicLevelPercent] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [dialogCloseRequested, setDialogCloseRequested] = useState(false);
  const [memoryCloseRequested, setMemoryCloseRequested] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number }>(getDefaultDialogPos);
  const [memoryPosition, setMemoryPosition] = useState<{ x: number; y: number }>(getDefaultMemoryPos);
  const [dialogSize, setDialogSize] = useState(() => ({ ...constants.session.defaultDialogSizePx }));
  const [memorySize, setMemorySize] = useState(() => ({ ...constants.session.defaultMemorySizePx }));
  const [aiVolumePercent, setAiVolumePercent] = useState(80);
  /** Усиление микрофона 0.5–4 (отображается как 50–400%). */
  const [micSensitivity, setMicSensitivity] = useState(1);
  const [screenCaptureSettings, setScreenCaptureSettings] = useState<ScreenCaptureSettings>(
    () => ({ ...constants.session.screenCapture })
  );
  const screenCaptureSettingsRef = useRef<ScreenCaptureSettings>(screenCaptureSettings);
  screenCaptureSettingsRef.current = screenCaptureSettings;

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micLevelSmoothedRef = useRef(0);
  const micSensitivityRef = useRef(micSensitivity);
  micSensitivityRef.current = micSensitivity;
  const dialogVisibleRef = useRef(dialogVisible);
  const memoryVisibleRef = useRef(memoryVisible);
  const onMicErrorRef = useRef(onMicError);
  const tRef = useRef(t);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingFrameRef = useRef(false);
  const setScreenSharingRef = useRef(setScreenSharing);
  dialogVisibleRef.current = dialogVisible;
  memoryVisibleRef.current = memoryVisible;
  onMicErrorRef.current = onMicError;
  tRef.current = t;
  setScreenSharingRef.current = setScreenSharing;

  useEffect(() => {
    if (!session || !sessionReady || !micOn) {
      if (!micOn && micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (micSourceRef.current) {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
      }
      if (inputAudioContextRef.current && inputAudioContextRef.current.state !== "closed") {
        inputAudioContextRef.current.close().catch(() => {});
        inputAudioContextRef.current = null;
      }
      if (!micOn) {
        setMicLevelPercent(0);
        micLevelSmoothedRef.current = 0;
      }
      return;
    }

    let cancelled = false;
    const workletUrl = `${import.meta.env.BASE_URL || "/"}pcm-capture.worklet.js`;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        micStreamRef.current = stream;

        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: PCM_SAMPLE_RATE,
        });
        if (cancelled) {
          ctx.close().catch(() => {});
          return;
        }
        inputAudioContextRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        await ctx.audioWorklet.addModule(workletUrl);
        if (cancelled) return;

        const source = ctx.createMediaStreamSource(stream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = micSensitivityRef.current;
        micGainNodeRef.current = gainNode;
        const workletNode = new AudioWorkletNode(ctx, "pcm-capture", { numberOfInputs: 1, numberOfOutputs: 1 });

        workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (!micOn) return;
          const samples = e.data;
          let sum = 0;
          for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
          const rms = Math.sqrt(sum / samples.length);
          const raw = rms < 0.012 ? 0 : Math.min(1, 1 - Math.exp(-rms * 18));
          const s = micLevelSmoothedRef.current;
          const alpha = raw > s ? 0.8 : 0.28;
          micLevelSmoothedRef.current = alpha * raw + (1 - alpha) * s;
          setMicLevelPercent(Math.round(micLevelSmoothedRef.current * 100));
          try {
            const pcmBlob = createPcmBlob(samples);
            session.sendRealtimeInput({ audio: pcmBlob });
          } catch (err) {
            console.warn("sendRealtimeInput failed:", err);
          }
        };

        source.connect(gainNode);
        gainNode.connect(workletNode);
        workletNode.connect(ctx.destination);

        micSourceRef.current = source;
        workletNodeRef.current = workletNode;
      } catch (err) {
        micGainNodeRef.current = null;
        console.error("Microphone setup failed:", err);
        if (!cancelled) {
          setMicLevelPercent(0);
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? tRef.current("micErrorPermission")
              : err instanceof DOMException && err.name === "NotFoundError"
                ? tRef.current("micErrorNotFound")
                : err instanceof Error
                  ? err.message
                  : tRef.current("micErrorGeneric");
          onMicErrorRef.current?.(msg);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (micSourceRef.current) {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
      }
      if (inputAudioContextRef.current && inputAudioContextRef.current.state !== "closed") {
        inputAudioContextRef.current.close().catch(() => {});
        inputAudioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((tr) => tr.stop());
        micStreamRef.current = null;
      }
      setMicLevelPercent(0);
      micGainNodeRef.current = null;
    };
  }, [session, sessionReady, micOn]);

  useEffect(() => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = micSensitivity;
    }
  }, [micSensitivity]);

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
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
        screenVideoRef.current = null;
      }
    };

    if (!session || !sessionReady || !screenSharing) {
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
            if (blob && !cancelled && screenStreamRef.current) {
              const base64 = await blobToBase64(blob);
              session.sendRealtimeInput({ media: { data: base64, mimeType: "image/jpeg" } });
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
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        screenStreamRef.current = stream;

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
        const sampleCtx = sampleCanvas.getContext("2d");
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
          onMicErrorRef.current?.(msg);
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [session, sessionReady, screenSharing]);

  const onDialogPositionChange = useCallback((pos: { x: number; y: number }) => setDialogPosition(pos), []);
  const onMemoryPositionChange = useCallback((pos: { x: number; y: number }) => setMemoryPosition(pos), []);
  const onDialogResize = useCallback((size: { width: number; height: number }) => setDialogSize(size), []);
  const onMemoryResize = useCallback((size: { width: number; height: number }) => setMemorySize(size), []);

  return {
    micOn,
    setMicOn,
    micLevelPercent,
    screenSharing,
    setScreenSharing,
    cameraOn,
    setCameraOn,
    dialogVisible,
    memoryVisible,
    dialogCloseRequested,
    memoryCloseRequested,
    dialogPosition,
    memoryPosition,
    dialogSize,
    memorySize,
    aiVolumePercent,
    setAiVolumePercent,
    micSensitivity,
    setMicSensitivity,
    screenCaptureSettings,
    setScreenCaptureSettings,
    onDialogPositionChange,
    onMemoryPositionChange,
    onDialogResize,
    onMemoryResize,
    setDialogVisible,
    setDialogCloseRequested,
    setMemoryVisible,
    setMemoryCloseRequested,
    onDialogTabToggle: useCallback(() => {
      if (dialogVisibleRef.current) setDialogCloseRequested(true);
      else setDialogVisible(true);
    }, []),
    onMemoryTabToggle: useCallback(() => {
      if (memoryVisibleRef.current) setMemoryCloseRequested(true);
      else setMemoryVisible(true);
    }, []),
  };
}
