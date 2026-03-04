import type { RealtimeInputPayload } from "./RealtimeInputPayload.ts";

export * from "./RealtimeInputPayload.ts";

/** Аудио-чанк от сервера (base64) */
export interface AudioChunkPayload {
  data?: string;
  mimeType?: string;
}

/** Нормализованное сообщение от сервера (не привязано к формату конкретного ИИ) */
export interface LiveMessagePayload {
  inputTranscription?: { text: string };
  outputTranscription?: { text: string };
  turnComplete?: unknown;
  modelTurn?: {
    parts: Array<{ inlineData?: { data: string; mimeType?: string } }>;
  };
  /** Аудио-ответ (часто приходит в этом поле вместо modelTurn) */
  audioChunks?: AudioChunkPayload[];
  interrupted?: unknown;
}

export interface LiveConnectionCallbacks {
  onopen?: () => void;
  onclose?: () => void;
  onerror?: (error: unknown) => void;
  onmessage?: (message: LiveMessagePayload) => void;
}

export interface LiveConnectionConfig {
  systemInstruction: string;
  model?: string;
  voiceName?: string;
  callbacks?: LiveConnectionCallbacks;
}

/** Сессия live-диалога */
export interface ILiveSession {
  sendRealtimeInput(payload: RealtimeInputPayload): void;
  close(): void;
}

/** Клиент live-ИИ. Реализации: gemini/client, в будущем chatgpt/client и т.д. */
export interface ILiveClient {
  connect(config: LiveConnectionConfig): Promise<ILiveSession>;
}
