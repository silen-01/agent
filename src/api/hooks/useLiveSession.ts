import { useState, useCallback, useRef, useEffect } from "react";
import { config } from "@modules";
import { createLiveClient, type ILiveSession } from "../index.ts";
import type { LiveMessagePayload } from "../types/index.ts";
import {
  decodePcmToBuffer,
  base64ToUint8Array,
  OUTPUT_SAMPLE_RATE,
} from "../utils/audioUtils.ts";

const MAX_DIALOG_MESSAGES = 20;

/** 100% = 1 MB/с (сумма отправки + приёма по этому соединению). Реальная нагрузка на сеть сессии. */
const NETWORK_LOAD_SCALE_BYTES_PER_SEC = 1048576;
/** Ниже этого порога (байт/с) показываем 0% — фоновый трафик. */
const NETWORK_LOAD_FLOOR_BYTES_PER_SEC = 32768;

export type DialogMessage = { role: "user" | "model"; text: string };

type Translate = (key: "connectionErrorNoKey" | "connectionErrorGeneric") => string;

export const useLiveSession = () => {
  const [session, setSession] = useState<ILiveSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [inputTranscription, setInputTranscription] = useState("");
  const [outputTranscription, setOutputTranscription] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [networkLoadPercent, setNetworkLoadPercent] = useState(0);

  const outputCtxRef = useRef<AudioContext | null>(null);
  const bytesSentInWindowRef = useRef(0);
  const bytesReceivedInWindowRef = useRef(0);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputVolumeRef = useRef(0.8);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const setOutputVolume = useCallback((volumeNormalized: number) => {
    const v = Math.max(0, Math.min(1, volumeNormalized));
    outputVolumeRef.current = v;
    if (outputGainRef.current) outputGainRef.current.gain.value = v;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const sent = bytesSentInWindowRef.current;
      const received = bytesReceivedInWindowRef.current;
      bytesSentInWindowRef.current = 0;
      bytesReceivedInWindowRef.current = 0;
      const bytesPerSecond = sent + received;
      const percent =
        bytesPerSecond <= NETWORK_LOAD_FLOOR_BYTES_PER_SEC
          ? 0
          : Math.min(
              100,
              Math.round(
                ((bytesPerSecond - NETWORK_LOAD_FLOOR_BYTES_PER_SEC) /
                  (NETWORK_LOAD_SCALE_BYTES_PER_SEC - NETWORK_LOAD_FLOOR_BYTES_PER_SEC)) *
                  100
              )
            );
      setNetworkLoadPercent(percent);
    }, 1000);
    return () => clearInterval(interval);
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

  const estimateMessageSize = useCallback((message: LiveMessagePayload): number => {
    let bytes = 200;
    if (message.modelTurn?.parts) {
      for (const part of message.modelTurn.parts) {
        const data = part.inlineData?.data;
        if (typeof data === "string") bytes += (data.length * 3) >> 2;
      }
    }
    if (message.audioChunks?.length) {
      for (const chunk of message.audioChunks) {
        if (chunk.data) bytes += (chunk.data.length * 3) >> 2;
      }
    }
    return bytes;
  }, []);

  const handleMessage = useCallback(
    (message: LiveMessagePayload) => {
      bytesReceivedInWindowRef.current += estimateMessageSize(message);
      if (message.interrupted || message.turnComplete) {
        stopAllPlayback();
      }
      if (message.turnComplete) {
        setInputTranscription((userText) => {
          setOutputTranscription((modelText) => {
            const toAdd: DialogMessage[] = [];
            if (userText.trim()) toAdd.push({ role: "user", text: userText.trim() });
            if (modelText.trim()) toAdd.push({ role: "model", text: modelText.trim() });
            if (toAdd.length) {
              setMessages((prev) => [...prev, ...toAdd].slice(-MAX_DIALOG_MESSAGES));
            }
            return "";
          });
          return "";
        });
        nextStartTimeRef.current = 0;
      }
      if (message.inputTranscription?.text !== undefined) {
        setInputTranscription((prev) => prev + message.inputTranscription!.text);
      }
      if (message.outputTranscription?.text !== undefined) {
        setOutputTranscription((prev) => prev + message.outputTranscription!.text);
      }
      if (message.modelTurn?.parts) {
        for (const part of message.modelTurn.parts) {
          const data = part.inlineData?.data;
          if (!data) continue;
          playAudioChunk(data).catch((e) => console.warn("Output audio play failed:", e));
        }
      }

      if (message.audioChunks?.length) {
        for (const chunk of message.audioChunks) {
          if (chunk.data) {
            playAudioChunk(chunk.data).catch((e) => console.warn("Output audio play failed:", e));
          }
        }
      }
    },
    [playAudioChunk, estimateMessageSize, stopAllPlayback]
  );

  const launch = useCallback(
    async (
      systemInstruction: string,
      t: Translate,
      showToast: (msg: string) => void,
      voiceName?: string
    ) => {
      setConnectionError(null);
      setIsConnecting(true);
      setSessionReady(false);
      setInputTranscription("");
      setOutputTranscription("");
      setMessages([]);
      nextStartTimeRef.current = 0;

      const apiKey = config.api.geminiApiKey?.trim() ?? "";
      if (!apiKey) {
        const msg = t("connectionErrorNoKey");
        setConnectionError(msg);
        showToast(msg);
        setIsConnecting(false);
        return;
      }

      try {
        const client = createLiveClient("gemini", { apiKey });
        const rawSession = await client.connect({
          systemInstruction,
          ...(voiceName && { voiceName }),
          callbacks: {
            onopen: () => setSessionReady(true),
            onclose: () => setSessionReady(false),
            onerror: (err) => console.error("Live session error:", err),
            onmessage: handleMessage,
          },
        });
        const wrappedSession: ILiveSession = {
          sendRealtimeInput(payload) {
            let bytes = 0;
            if ("audio" in payload && payload.audio?.data)
              bytes = (payload.audio.data.length * 3) >> 2;
            else if ("text" in payload && payload.text) bytes = new TextEncoder().encode(payload.text).length;
            else if ("media" in payload && payload.media) {
              const m = payload.media;
              if (typeof (m as { data?: string }).data === "string")
                bytes = ((m as { data: string }).data.length * 3) >> 2;
            }
            bytesSentInWindowRef.current += bytes;
            rawSession.sendRealtimeInput(payload);
          },
          close: () => rawSession.close(),
        };
        setSession(wrappedSession);
      } catch (err) {
        console.error("Connect failed:", err);
        const msg = t("connectionErrorGeneric");
        setConnectionError(msg);
        showToast(msg);
      } finally {
        setIsConnecting(false);
      }
    },
    [handleMessage]
  );

  const disconnect = useCallback(() => {
    session?.close();
    setSession(null);
    setSessionReady(false);
    setMessages([]);
    setInputTranscription("");
    setOutputTranscription("");
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
  }, [session]);

  return {
    session,
    sessionReady,
    isSpeaking,
    messages,
    inputTranscription,
    outputTranscription,
    isConnecting,
    connectionError,
    setConnectionError,
    setOutputVolume,
    networkLoadPercent,
    launch,
    disconnect,
  };
};
