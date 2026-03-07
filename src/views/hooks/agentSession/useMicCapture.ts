import { useState, useEffect, useRef } from "react";
import type { ILiveSession } from "../../../api/index.ts";
import { language } from "@modules";
import { createPcmBlob, PCM_SAMPLE_RATE } from "../../../api/utils/audioUtils.ts";

export type UseMicCaptureParams = {
  session: ILiveSession;
  sessionReady: boolean;
  micOn: boolean;
  micSensitivity: number;
  onMicError?: (message: string) => void;
};

export function useMicCapture({
  session,
  sessionReady,
  micOn,
  micSensitivity,
  onMicError,
}: UseMicCaptureParams) {
  const { t } = language.useLanguage();
  const [micLevelPercent, setMicLevelPercent] = useState(0);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micLevelSmoothedRef = useRef(0);
  const micSensitivityRef = useRef(micSensitivity);
  const onMicErrorRef = useRef(onMicError);
  const tRef = useRef(t);
  useEffect(() => {
    micSensitivityRef.current = micSensitivity;
    onMicErrorRef.current = onMicError;
    tRef.current = t;
  }, [micSensitivity, onMicError, t]);

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
      if (!micOn) micLevelSmoothedRef.current = 0;
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
      micGainNodeRef.current = null;
    };
  }, [session, sessionReady, micOn]);

  useEffect(() => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = micSensitivity;
    }
  }, [micSensitivity]);

  return { micLevelPercent: micOn ? micLevelPercent : 0 };
}
