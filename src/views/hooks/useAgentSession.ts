import { useState, useCallback, useEffect, useRef } from "react";
import type { ILiveSession } from "../../api/index.ts";
import { language, constants } from "@modules";
import { createPcmBlob, PCM_SAMPLE_RATE } from "../../api/utils/audioUtils.ts";

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
  dialogVisibleRef.current = dialogVisible;
  memoryVisibleRef.current = memoryVisible;
  onMicErrorRef.current = onMicError;
  tRef.current = t;

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
