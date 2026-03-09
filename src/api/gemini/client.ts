import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import type {
  ILiveClient,
  ILiveSession,
  LiveConnectionConfig,
  LiveMessagePayload,
} from "../types/index.ts";
import { GeminiSessionAdapter } from "./sessionAdapter";

const DEFAULT_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

/** Реализация ILiveClient для Gemini. Вся логика Gemini изолирована в этой папке. */
export class GeminiLiveClient implements ILiveClient {
  private readonly ai: InstanceType<typeof GoogleGenAI>;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(config: LiveConnectionConfig): Promise<ILiveSession> {
    const callbacks = config.callbacks ?? {};
    const model = config.model ?? DEFAULT_MODEL;
    console.log("[LiveSession] GeminiLiveClient.connect() start, model:", model);

    const session = await this.ai.live.connect({
      model,
      callbacks: {
        onopen: callbacks.onopen,
        onclose: callbacks.onclose,
        onerror: callbacks.onerror,
        onmessage: (message: LiveServerMessage) => {
          callbacks.onmessage?.(this.mapToPayload(message));
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: config.systemInstruction,
        ...(config.voiceName && {
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
        }),
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

    console.log("[LiveSession] GeminiLiveClient.connect() resolved");
    return new GeminiSessionAdapter(session);
  }

  private mapToPayload(msg: LiveServerMessage): LiveMessagePayload {
    const c = msg.serverContent as Record<string, unknown> | undefined;
    if (!c) return {};
    return {
      inputTranscription: c.inputTranscription as LiveMessagePayload["inputTranscription"],
      outputTranscription: c.outputTranscription as LiveMessagePayload["outputTranscription"],
      turnComplete: c.turnComplete,
      modelTurn: c.modelTurn as LiveMessagePayload["modelTurn"],
      audioChunks: c.audioChunks as LiveMessagePayload["audioChunks"],
      interrupted: c.interrupted,
    };
  }
}
