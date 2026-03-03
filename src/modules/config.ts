import { from } from "env-var";

const env = from(import.meta.env);

export type Config = {
  appVersion: string;
  /** API: ключи. Локально — .env (VITE_GEMINI_API_KEY). В проде — переменная при сборке/деплое. */
  api: {
    geminiApiKey: string;
  };
};

export const config: Config = {
  appVersion: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0",
  api: {
    geminiApiKey: env.get("VITE_GEMINI_API_KEY").default("").asString(),
  },
};
