import type { ILiveClient } from "./types/index.ts";
import { GeminiLiveClient } from "./gemini/client.ts";

export type LiveProviderId = "gemini";

/** Создаёт клиент по имени провайдера. Сервис не импортирует gemini/chatgpt напрямую. */
export function createLiveClient(
  provider: LiveProviderId,
  options: { apiKey: string }
): ILiveClient {
  switch (provider) {
    case "gemini":
      return new GeminiLiveClient(options.apiKey);
    default:
      throw new Error(`Unknown live provider: ${provider}`);
  }
}
