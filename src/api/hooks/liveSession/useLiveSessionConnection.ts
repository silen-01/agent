import { useState, useCallback, useRef, useEffect } from "react";
import { getGeminiApiKey } from "@modules";
import { createLiveClient, type ILiveSession } from "../../index.ts";
import type { LiveMessagePayload } from "../../types/index.ts";

/** 100% = 1 MB/с (сумма отправки + приёма по этому соединению). */
const NETWORK_LOAD_SCALE_BYTES_PER_SEC = 1048576;
const NETWORK_LOAD_FLOOR_BYTES_PER_SEC = 32768;
const RECONNECT_DELAY_MS = 2000;
const RECONNECT_MAX_ATTEMPTS = 5;
const READY_FALLBACK_MS = 12000;

const LOG_PREFIX = "[LiveSession]";
function log(msg: string, ...args: unknown[]) {
  console.log(LOG_PREFIX, msg, ...args);
}

/** Типичные причины обрыва: таймаут на стороне API (долгое молчание/длительное соединение), сеть, "WebSocket is already in CLOSING or CLOSED state" при отправке после закрытия. */

export type Translate = (key: "connectionErrorNoKey" | "connectionErrorGeneric") => string;

export type GetSystemInstruction = () => string;

export type LastLaunchParams = {
  /** Ref на геттер актуального промпта — при реконнекте читаем .current() здесь. */
  getSystemInstructionRef: { current: GetSystemInstruction };
  t: Translate;
  showToast: (msg: string) => void;
  voiceName?: string;
  autoReactionText: string;
};

function resolveSystemInstruction(params: LastLaunchParams): string {
  const fn = params.getSystemInstructionRef.current;
  return typeof fn === "function" ? fn() : "";
}

export type UseLiveSessionConnectionParams = {
  handleMessageRef: { current: (msg: LiveMessagePayload) => void };
  onDisconnect?: () => void;
  /** Вызывается после успешного реконнекта — сбросить стриминговые поля диалога, чтобы новые реплики не дописывались в старые блоки. */
  onSessionRestored?: () => void;
};

export function useLiveSessionConnection({
  handleMessageRef,
  onDisconnect,
  onSessionRestored,
}: UseLiveSessionConnectionParams) {
  const [session, setSession] = useState<ILiveSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [networkLoadPercent, setNetworkLoadPercent] = useState(0);

  const bytesSentInWindowRef = useRef(0);
  const bytesReceivedInWindowRef = useRef(0);
  const sessionRef = useRef<ILiveSession | null>(null);
  const lastLaunchParamsRef = useRef<LastLaunchParams | null>(null);
  const reconnectDisabledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const firstMessageReceivedRef = useRef(false);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastModelActivityRef = useRef(0);
  const reactionTimeoutSecondsRef = useRef(30);

  const markSessionReady = useCallback(() => {
    if (firstMessageReceivedRef.current) return;
    firstMessageReceivedRef.current = true;
    log("session ready (first message or fallback)");
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setSessionReady(true);
    setIsConnecting(false);
  }, []);

  const scheduleReadyFallback = useCallback(() => {
    firstMessageReceivedRef.current = false;
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    readyTimeoutRef.current = setTimeout(() => {
      readyTimeoutRef.current = null;
      markSessionReady();
    }, READY_FALLBACK_MS);
  }, [markSessionReady]);

  const scheduleReconnect = useCallback((callback: () => void, delay: number) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (reconnectDisabledRef.current || !lastLaunchParamsRef.current) return;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      callback();
    }, delay);
  }, []);

  const tryReconnectRef = useRef<() => void>(() => {});

  const wrapSession = useCallback(
    (rawSession: ILiveSession): ILiveSession => ({
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
            scheduleReconnect(() => tryReconnectRef.current(), RECONNECT_DELAY_MS);
          }
          throw e;
        }
      },
      close: () => rawSession.close(),
    }),
    [scheduleReconnect]
  );

  const tryReconnect = useCallback(() => {
    const params = lastLaunchParamsRef.current;
    if (!params || reconnectDisabledRef.current) return;
    log("tryReconnect start, attempt", reconnectAttemptRef.current);

    const doConnect = async () => {
      const apiKey = (await getGeminiApiKey())?.trim() ?? "";
      if (!apiKey) {
        params.showToast(params.t("connectionErrorNoKey"));
        setIsConnecting(false);
        return;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      firstMessageReceivedRef.current = false;
      log("tryReconnect: connect() start");
      const systemInstruction = resolveSystemInstruction(params);
      if (!systemInstruction?.trim()) {
        console.warn(LOG_PREFIX, "Reconnect: system instruction is empty");
      }
      createLiveClient("gemini", { apiKey })
        .connect({
          systemInstruction: systemInstruction || "You are a helpful assistant.",
          ...(params.voiceName && { voiceName: params.voiceName }),
          callbacks: {
            onopen: () => {
              log("tryReconnect onopen");
            },
            onclose: () => {
              log("tryReconnect onclose");
              setSessionReady(false);
              try {
                sessionRef.current?.close();
              } catch {
                /* сокет уже закрыт сервером */
              }
              sessionRef.current = null;
              if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                setIsConnecting(true);
                reconnectAttemptRef.current += 1;
                const delay =
                  reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS
                    ? RECONNECT_DELAY_MS * Math.min(reconnectAttemptRef.current, 4)
                    : 0;
                if (delay > 0) scheduleReconnect(doConnect, delay);
                else setIsConnecting(false);
              }
            },
            onerror: (err) => {
              console.error("Live session error:", err);
              setSessionReady(false);
              try {
                sessionRef.current?.close();
              } catch {
                /* сокет уже закрыт */
              }
              sessionRef.current = null;
              if (!reconnectDisabledRef.current && lastLaunchParamsRef.current) {
                setIsConnecting(true);
                reconnectAttemptRef.current += 1;
                const delay =
                  reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS
                    ? RECONNECT_DELAY_MS * Math.min(reconnectAttemptRef.current, 4)
                    : 0;
                if (delay > 0) scheduleReconnect(doConnect, delay);
                else setIsConnecting(false);
              }
            },
            onmessage: (msg) => handleMessageRef.current(msg),
          },
        })
        .then((rawSession) => {
          log("tryReconnect: connect() resolved");
          const wrapped = wrapSession(rawSession);
          sessionRef.current = wrapped;
          setSession(wrapped);
          setHasHadSession(true);
          onSessionRestored?.();
          scheduleReadyFallback();
        })
        .catch((err) => {
          log("tryReconnect: connect() failed", err);
          console.error("Reconnect failed:", err);
          reconnectAttemptRef.current += 1;
          if (
            reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS &&
            !reconnectDisabledRef.current &&
            lastLaunchParamsRef.current
          ) {
            scheduleReconnect(
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
  }, [scheduleReadyFallback, scheduleReconnect, handleMessageRef, wrapSession, onSessionRestored]);

  useEffect(() => {
    tryReconnectRef.current = tryReconnect;
  }, [tryReconnect]);

  const recordReceivedBytes = useCallback((bytes: number) => {
    bytesReceivedInWindowRef.current += bytes;
  }, []);

  const launch = useCallback(
    async (
      getSystemInstructionRef: { current: GetSystemInstruction },
      t: Translate,
      showToast: (msg: string) => void,
      voiceName?: string,
      reactionTimeoutSeconds?: number,
      autoReactionText?: string
    ) => {
      log("launch() called");
      setConnectionError(null);
      reconnectDisabledRef.current = false;
      reconnectAttemptRef.current = 0;
      setIsConnecting(true);
      setSessionReady(false);

      reactionTimeoutSecondsRef.current = Math.max(
        1,
        Math.min(120, reactionTimeoutSeconds ?? 30)
      );
      lastModelActivityRef.current = Date.now();

      sessionRef.current?.close();
      sessionRef.current = null;
      setSession(null);

      const apiKey = (await getGeminiApiKey())?.trim() ?? "";
      if (!apiKey) {
        const msg = t("connectionErrorNoKey");
        setConnectionError(msg);
        showToast(msg);
        setIsConnecting(false);
        return;
      }

      const params: LastLaunchParams = {
        getSystemInstructionRef,
        t,
        showToast,
        voiceName,
        autoReactionText: autoReactionText ?? "[React to what you see or hear.]",
      };
      lastLaunchParamsRef.current = params;

      try {
        firstMessageReceivedRef.current = false;
        log("launch: connect() start");
        const client = createLiveClient("gemini", { apiKey });
        const systemInstruction = resolveSystemInstruction(params);
        const rawSession = await client.connect({
          systemInstruction,
          ...(voiceName && { voiceName }),
          callbacks: {
            onopen: () => {
              log("onopen (initial connect)");
            },
            onclose: () => {
              log("onclose (socket closed)");
              setSessionReady(false);
              try {
                sessionRef.current?.close();
              } catch {
                /* сокет уже закрыт сервером */
              }
              sessionRef.current = null;
              if (!reconnectDisabledRef.current) {
                lastLaunchParamsRef.current = params;
                setIsConnecting(true);
                scheduleReconnect(tryReconnect, RECONNECT_DELAY_MS);
              }
            },
            onerror: (err) => {
              log("onerror", err);
              console.error("Live session error:", err);
              setSessionReady(false);
              try {
                sessionRef.current?.close();
              } catch {
                /* сокет уже закрыт */
              }
              sessionRef.current = null;
              if (!reconnectDisabledRef.current) {
                lastLaunchParamsRef.current = params;
                setIsConnecting(true);
                scheduleReconnect(tryReconnect, RECONNECT_DELAY_MS);
              }
            },
            onmessage: (msg) => handleMessageRef.current(msg),
          },
        });
        lastModelActivityRef.current = Date.now();
        log("launch: connect() resolved, session set");
        const wrappedSession = wrapSession(rawSession);
        sessionRef.current = wrappedSession;
        setSession(wrappedSession);
        setHasHadSession(true);
        scheduleReadyFallback();
      } catch (err) {
        console.error("Connect failed:", err);
        const msg = t("connectionErrorGeneric");
        setConnectionError(msg);
        showToast(msg);
        setIsConnecting(false);
      }
    },
    [tryReconnect, scheduleReadyFallback, scheduleReconnect, handleMessageRef, wrapSession]
  );

  const disconnect = useCallback(() => {
    reconnectDisabledRef.current = true;
    lastLaunchParamsRef.current = null;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    sessionRef.current?.close();
    sessionRef.current = null;
    setSession(null);
    setSessionReady(false);
    setIsConnecting(false);
    onDisconnect?.();
  }, [onDisconnect]);

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

  const markModelActivity = useCallback(() => {
    lastModelActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!session || !sessionReady) return;
    lastModelActivityRef.current = Date.now();
    const interval = setInterval(() => {
      const s = sessionRef.current;
      if (!s) return;
      const elapsed = (Date.now() - lastModelActivityRef.current) / 1000;
      if (elapsed >= reactionTimeoutSecondsRef.current) {
        try {
          const text = lastLaunchParamsRef.current?.autoReactionText ?? "[React to what you see or hear.]";
          s.sendRealtimeInput({ text });
          lastModelActivityRef.current = Date.now();
        } catch {
          /* ignore */
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, sessionReady]);

  return {
    session,
    setSession,
    sessionRef,
    sessionReady,
    isConnecting,
    connectionError,
    setConnectionError,
    networkLoadPercent,
    recordReceivedBytes,
    markModelActivity,
    launch,
    disconnect,
    markSessionReady,
    scheduleReadyFallback,
  };
}
