/** Синхронный конфиг приложения. Секреты не хранятся — только через getGeminiApiKey(). */
export type Config = {
  appVersion: string;
};

export const config: Config = {
  appVersion: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0",
};

/**
 * Возвращает API key для Gemini. В проде — только с сервера (GET /api/live-token).
 * В dev при наличии VITE_GEMINI_API_KEY в .env — из него (чтобы работать без backend).
 */
export async function getGeminiApiKey(): Promise<string> {
  if (import.meta.env.DEV) {
    const devKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (typeof devKey === "string" && devKey.trim()) {
      return devKey.trim();
    }
  }
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${base}/api/live-token`, { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as { apiKey?: string };
    return typeof data.apiKey === "string" ? data.apiKey.trim() : "";
  } catch {
    return "";
  }
}
