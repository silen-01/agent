import type { AgentSettings } from "@types";

export type Config = {
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
