import type { AgentSettings } from "@types";

export type Config = {
  appVersion: string;
  /** Доступность элементов управления (один источник правды для UI) */
  controls: {
    cameraEnabled: boolean;
  };
  agentSettings: {
    storageKey: string;
    default: AgentSettings;
  };
  toast: {
    visibleMs: number;
    exitMs: number;
  };
  language: {
    storageKey: string;
  };
};

export const config: Config = {
  appVersion: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0",
  controls: {
    cameraEnabled: false,
  },
  agentSettings: {
    storageKey: "agent_settings",
    default: {
      microphone: true,
      screenShare: true,
      camera: false,
      personality: "jarvis",
      tone: "friendly",
      allowProfanity: false,
      personalityPrompt: "",
      reactionTimeoutSeconds: 30,
      emotionality: 50,
    },
  },
  toast: {
    visibleMs: 2000,
    exitMs: 350,
  },
  language: {
    storageKey: "agent_lang",
  },
};
