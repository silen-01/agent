import { useState, useEffect, useRef } from "react";
import type { ILiveSession } from "../../../api/index.ts";
import { language } from "@modules";
import {
  createPcmBlob,
  PCM_SAMPLE_RATE,
  PCM_INPUT_BATCH_SAMPLES,
} from "../../../api/utils/audioUtils.ts";

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
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
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

        const source = ctx.createMediaStreamSource(stream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = micSensitivityRef.current;
        micGainNodeRef.current = gainNode;

        const processSamples = (samples: Float32Array) => {
          let sum = 0;
          for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
          const rms = Math.sqrt(sum / samples.length);
          const raw = rms < 0.012 ? 0 : Math.min(1, 1 - Math.exp(-rms * 18));
          const s = micLevelSmoothedRef.current;
          const alpha = raw > s ? 0.8 : 0.28;
          micLevelSmoothedRef.current = alpha * raw + (1 - alpha) * s;
          setMicLevelPercent(Math.round(micLevelSmoothedRef.current * 100));
          try {
            session.sendRealtimeInput({ audio: createPcmBlob(samples) });
          } catch (err) {
            console.warn("sendRealtimeInput failed:", err);
          }
        };

        if (typeof ctx.audioWorklet?.addModule === "function") {
          try {
            await ctx.audioWorklet.addModule(workletUrl);
            if (cancelled) return;
            const workletNode = new AudioWorkletNode(ctx, "pcm-capture", {
              numberOfInputs: 1,
              numberOfOutputs: 1,
            });
            workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
              if (!micOn) return;
              processSamples(e.data);
            };
            source.connect(gainNode);
            gainNode.connect(workletNode);
            workletNode.connect(ctx.destination);
            workletNodeRef.current = workletNode;
          } catch (workletErr) {
            console.warn("AudioWorklet failed, using ScriptProcessor fallback:", workletErr);
          }
        }

        if (!workletNodeRef.current) {
          const bufferSize = PCM_INPUT_BATCH_SAMPLES;
          const scriptProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);
          scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
            if (!micOn) return;
            const input = e.inputBuffer.getChannelData(0);
            const samples = new Float32Array(input.length);
            samples.set(input);
            processSamples(samples);
          };
          source.connect(gainNode);
          gainNode.connect(scriptProcessor);
          scriptProcessor.connect(ctx.destination);
          scriptProcessorRef.current = scriptProcessor;
        }

        micSourceRef.current = source;
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
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
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
