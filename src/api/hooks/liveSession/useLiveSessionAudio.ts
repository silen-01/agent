import { useState, useCallback, useRef } from "react";
import {
  decodePcmToBuffer,
  base64ToUint8Array,
  OUTPUT_SAMPLE_RATE,
} from "../../utils/audioUtils.ts";

export function useLiveSessionAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputVolumeRef = useRef(0.8);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const setOutputVolume = useCallback((volumeNormalized: number) => {
    const v = Math.max(0, Math.min(1, volumeNormalized));
    outputVolumeRef.current = v;
    if (outputGainRef.current) outputGainRef.current.gain.value = v;
  }, []);

  const stopAllPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* уже остановлен */
      }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!outputCtxRef.current) {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      outputCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = outputVolumeRef.current;
      gain.connect(ctx.destination);
      outputGainRef.current = gain;
    }
    const ctx = outputCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = await decodePcmToBuffer(
      base64ToUint8Array(base64Data),
      ctx,
      OUTPUT_SAMPLE_RATE,
      1
    );
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGainRef.current!);
    activeSourcesRef.current.add(source);
    setIsSpeaking(true);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
    };

    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
  }, []);

  const cleanup = useCallback(() => {
    outputGainRef.current = null;
    if (outputCtxRef.current?.state !== "closed") {
      outputCtxRef.current?.close().catch(() => {});
      outputCtxRef.current = null;
    }
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  return {
    isSpeaking,
    setOutputVolume,
    stopAllPlayback,
    playAudioChunk,
    cleanup,
  };
}
