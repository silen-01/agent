import { useState, useCallback, useRef, useEffect } from "react";
import { config, extractMemoryItemsFromText, getMemoryItemDedupKey, stripMemoryMarkersFromText } from "@modules";
import { createLiveClient, type ILiveSession } from "../index.ts";
import type { LiveMessagePayload } from "../types/index.ts";
import {
  decodePcmToBuffer,
  base64ToUint8Array,
  OUTPUT_SAMPLE_RATE,
} from "../utils/audioUtils.ts";

const MAX_DIALOG_MESSAGES = 20;

export type UseLiveSessionOptions = {
  /** Вызывается, когда в ответе ИИ обнаружен фрагмент [MEMORY: факт] — факт нужно сохранить в память. */
  onMemoryItemExtracted?: (item: string) => void;
};

/** 100% = 1 MB/с (сумма отправки + приёма по этому соединению). Реальная нагрузка на сеть сессии. */
const NETWORK_LOAD_SCALE_BYTES_PER_SEC = 1048576;
/** Ниже этого порога (байт/с) показываем 0% — фоновый трафик. */
const NETWORK_LOAD_FLOOR_BYTES_PER_SEC = 32768;

export type DialogMessage = { role: "user" | "model"; text: string };

type Translate = (key: "connectionErrorNoKey" | "connectionErrorGeneric") => string;

export const useLiveSession = (options: UseLiveSessionOptions = {}) => {
  const { onMemoryItemExtracted } = options;
  const onMemoryItemExtractedRef = useRef(onMemoryItemExtracted);
  onMemoryItemExtractedRef.current = onMemoryItemExtracted;

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
  const sessionRef = useRef<ILiveSession | null>(null);
  const lastLaunchParamsRef = useRef<{
    systemInstruction: string;
    t: Translate;
    showToast: (msg: string) => void;
    voiceName?: string;
  } | null>(null);
  const reconnectDisabledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const handleMessageRef = useRef<(msg: LiveMessagePayload) => void>(() => {});
  const firstMessageReceivedRef = useRef(false);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Время последней активности модели (для автореакции по таймауту). */
  const lastModelActivityRef = useRef(0);
  /** Интервал автореакции в секундах (из настроек). */
  const reactionTimeoutSecondsRef = useRef(30);
  /** Накопленный текст ответа модели в текущем ходе (для извлечения [MEMORY: ...]). */
  const currentTurnOutputRef = useRef("");
  /** Уже переданные в onMemoryItemExtracted факты в этом ходе (чтобы не дублировать). */
  const extractedThisTurnRef = useRef<Set<string>>(new Set());
  const RECONNECT_DELAY_MS = 2000;
  const RECONNECT_MAX_ATTEMPTS = 5;
  /** Если за это время не пришло ни одного сообщения от сервера — считаем готовым по таймауту */
  const READY_FALLBACK_MS = 12000;

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

  useEffect(() => {
    if (!session || !sessionReady) return;
    lastModelActivityRef.current = Date.now();
    const interval = setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      const elapsed = (Date.now() - lastModelActivityRef.current) / 1000;
      if (elapsed >= reactionTimeoutSecondsRef.current) {
        try {
          session.sendRealtimeInput({
            text: "[React to what you see or hear.]",
          });
          lastModelActivityRef.current = Date.now();
        } catch {
          /* ignore send errors */
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, sessionReady]);

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

  const markSessionReady = useCallback(() => {
    if (firstMessageReceivedRef.current) return;
    firstMessageReceivedRef.current = true;
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setSessionReady(true);
    setIsConnecting(false);
  }, []);

  const handleMessage = useCallback(
    (message: LiveMessagePayload) => {
      markSessionReady();
      bytesReceivedInWindowRef.current += estimateMessageSize(message);
      const hasModelOutput =
        message.outputTranscription?.text !== undefined ||
        (message.modelTurn?.parts?.length ?? 0) > 0 ||
        (message.audioChunks?.length ?? 0) > 0;
      if (hasModelOutput) lastModelActivityRef.current = Date.now();

      if (message.interrupted) {
        stopAllPlayback();
        currentTurnOutputRef.current = "";
        extractedThisTurnRef.current = new Set();
      }
      if (message.turnComplete) {
        nextStartTimeRef.current = 0;
        currentTurnOutputRef.current = "";
        extractedThisTurnRef.current = new Set();
        setInputTranscription((userText) => {
          setOutputTranscription((modelText) => {
            const toAdd: DialogMessage[] = [];
            if (userText.trim()) toAdd.push({ role: "user", text: userText.trim() });
            if (modelText.trim()) toAdd.push({ role: "model", text: stripMemoryMarkersFromText(modelText.trim()) });
            if (toAdd.length) {
              setMessages((prev) => [...prev, ...toAdd].slice(-MAX_DIALOG_MESSAGES));
            }
            return "";
          });
          return "";
        });
      }
      if (message.inputTranscription?.text !== undefined) {
        setInputTranscription((prev) => prev + message.inputTranscription!.text);
      }
      if (message.outputTranscription?.text !== undefined) {
        const chunk = message.outputTranscription.text;
        currentTurnOutputRef.current += chunk;
        const items = extractMemoryItemsFromText(currentTurnOutputRef.current);
        const cb = onMemoryItemExtractedRef.current;
        if (cb) {
          for (const item of items) {
            const key = getMemoryItemDedupKey(item);
            if (!extractedThisTurnRef.current.has(key)) {
              extractedThisTurnRef.current.add(key);
              cb(item);
            }
          }
        }
        setOutputTranscription((prev) => prev + chunk);
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
    [playAudioChunk, estimateMessageSize, stopAllPlayback, markSessionReady]
  );
  handleMessageRef.current = handleMessage;

  const scheduleReadyFallback = useCallback(() => {
    firstMessageReceivedRef.current = false;
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    readyTimeoutRef.current = setTimeout(() => {
      readyTimeoutRef.current = null;
      markSessionReady();
    }, READY_FALLBACK_MS);
  }, [markSessionReady]);

  const tryReconnect = useCallback((): void => {
    const params = lastLaunchParamsRef.current;
    if (!params || reconnectDisabledRef.current) return;
    const apiKey = config.api.geminiApiKey?.trim() ?? "";
    if (!apiKey) return;

    const doConnect = () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      firstMessageReceivedRef.current = false;
      createLiveClient("gemini", { apiKey })
        .connect({
          systemInstruction: params.systemInstruction,
          ...(params.voiceName && { voiceName: params.voiceName }),
          callbacks: {
            onopen: () => {},
            onclose: () => {
              setSessionReady(false);
              sessionRef.current?.close();
              sessionRef.current = null;
              if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                setIsConnecting(true);
                reconnectAttemptRef.current += 1;
                const delay =
                  reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS
                    ? RECONNECT_DELAY_MS * Math.min(reconnectAttemptRef.current, 4)
                    : 0;
                if (delay > 0) setTimeout(doConnect, delay);
                else setIsConnecting(false);
              }
            },
            onerror: (err) => {
              console.error("Live session error:", err);
              setSessionReady(false);
              sessionRef.current?.close();
              sessionRef.current = null;
              if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                setIsConnecting(true);
                reconnectAttemptRef.current += 1;
                const delay =
                  reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS
                    ? RECONNECT_DELAY_MS * Math.min(reconnectAttemptRef.current, 4)
                    : 0;
                if (delay > 0) setTimeout(doConnect, delay);
                else setIsConnecting(false);
              }
            },
            onmessage: (msg) => handleMessageRef.current(msg),
          },
        })
        .then((rawSession) => {
          const wrappedSession: ILiveSession = {
            sendRealtimeInput(payload) {
              let bytes = 0;
              if ("audio" in payload && payload.audio?.data)
                bytes = (payload.audio.data.length * 3) >> 2;
              else if ("text" in payload && payload.text)
                bytes = new TextEncoder().encode(payload.text).length;
              else if ("media" in payload && payload.media) {
                const m = payload.media;
                if (typeof (m as { data?: string }).data === "string")
                  bytes = ((m as { data: string }).data.length * 3) >> 2;
              }
              bytesSentInWindowRef.current += bytes;
              try {
                rawSession.sendRealtimeInput(payload);
              } catch (e) {
                setSessionReady(false);
                if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                  setIsConnecting(true);
                  setTimeout(doConnect, RECONNECT_DELAY_MS);
                }
                throw e;
              }
            },
            close: () => rawSession.close(),
          };
          sessionRef.current = wrappedSession;
          setSession(wrappedSession);
          scheduleReadyFallback();
        })
        .catch((err) => {
          console.error("Reconnect failed:", err);
          reconnectAttemptRef.current += 1;
          if (
            reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS &&
            !reconnectDisabledRef.current &&
            lastLaunchParamsRef.current
          ) {
            setTimeout(
              doConnect,
              RECONNECT_DELAY_MS * Math.min(reconnectAttemptRef.current, 4)
            );
          } else {
            setIsConnecting(false);
            params.showToast(params.t("connectionErrorGeneric"));
          }
        });
    };

    doConnect();
  }, [scheduleReadyFallback]);

  const launch = useCallback(
    async (
      systemInstruction: string,
      t: Translate,
      showToast: (msg: string) => void,
      voiceName?: string,
      reactionTimeoutSeconds?: number
    ) => {
      setConnectionError(null);
      reconnectDisabledRef.current = false;
      reconnectAttemptRef.current = 0;
      setIsConnecting(true);
      setSessionReady(false);
      setInputTranscription("");
      setOutputTranscription("");
      setMessages([]);
      nextStartTimeRef.current = 0;
      reactionTimeoutSecondsRef.current = Math.max(
        1,
        Math.min(120, reactionTimeoutSeconds ?? 30)
      );
      lastModelActivityRef.current = Date.now();

      sessionRef.current?.close();
      sessionRef.current = null;
      setSession(null);

      const apiKey = config.api.geminiApiKey?.trim() ?? "";
      if (!apiKey) {
        const msg = t("connectionErrorNoKey");
        setConnectionError(msg);
        showToast(msg);
        setIsConnecting(false);
        return;
      }

      try {
        firstMessageReceivedRef.current = false;
        const client = createLiveClient("gemini", { apiKey });
        const rawSession = await client.connect({
          systemInstruction,
          ...(voiceName && { voiceName }),
          callbacks: {
            onopen: () => {},
            onclose: () => {
              setSessionReady(false);
              sessionRef.current?.close();
              sessionRef.current = null;
              if (!reconnectDisabledRef.current) {
                lastLaunchParamsRef.current = {
                  systemInstruction,
                  t,
                  showToast,
                  voiceName,
                };
                setIsConnecting(true);
                setTimeout(tryReconnect, RECONNECT_DELAY_MS);
              }
            },
            onerror: (err) => {
              console.error("Live session error:", err);
              setSessionReady(false);
              sessionRef.current?.close();
              sessionRef.current = null;
              if (!reconnectDisabledRef.current) {
                lastLaunchParamsRef.current = {
                  systemInstruction,
                  t,
                  showToast,
                  voiceName,
                };
                setIsConnecting(true);
                setTimeout(tryReconnect, RECONNECT_DELAY_MS);
              }
            },
            onmessage: handleMessage,
          },
        });
        lastLaunchParamsRef.current = { systemInstruction, t, showToast, voiceName };
        lastModelActivityRef.current = Date.now();
        const wrappedSession: ILiveSession = {
          sendRealtimeInput(payload) {
            let bytes = 0;
            if ("audio" in payload && payload.audio?.data)
              bytes = (payload.audio.data.length * 3) >> 2;
            else if ("text" in payload && payload.text)
              bytes = new TextEncoder().encode(payload.text).length;
            else if ("media" in payload && payload.media) {
              const m = payload.media;
              if (typeof (m as { data?: string }).data === "string")
                bytes = ((m as { data: string }).data.length * 3) >> 2;
            }
            bytesSentInWindowRef.current += bytes;
            try {
              rawSession.sendRealtimeInput(payload);
            } catch (e) {
              setSessionReady(false);
              if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                setIsConnecting(true);
                setTimeout(tryReconnect, RECONNECT_DELAY_MS);
              }
              throw e;
            }
          },
          close: () => rawSession.close(),
        };
        sessionRef.current = wrappedSession;
        setSession(wrappedSession);
        scheduleReadyFallback();
      } catch (err) {
        console.error("Connect failed:", err);
        const msg = t("connectionErrorGeneric");
        setConnectionError(msg);
        showToast(msg);
        setIsConnecting(false);
      }
    },
    [tryReconnect, scheduleReadyFallback]
  );

  const disconnect = useCallback(() => {
    reconnectDisabledRef.current = true;
    lastLaunchParamsRef.current = null;
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    sessionRef.current?.close();
    sessionRef.current = null;
    setSession(null);
    setSessionReady(false);
    setIsConnecting(false);
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
  }, []);

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
