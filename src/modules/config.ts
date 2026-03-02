import type { AgentSettings } from "@types";

export type Config = {
  appVersion: string;
  /** Доступность элементов управления (один источник правды для UI) */
  controls: {
    cameraEnabled: boolean;
  };
  /** Страница сессии: плавающие окна и нижняя панель */
  session: {
    /** Высота нижней панели (тулбар + статус-бар + отступы), px */
    bottomPanelOffsetPx: number;
  };
  /** Плавающие панели (диалог, память) */
  draggablePanel: {
    paddingPx: number;
    gapPx: number;
    defaultMinWidthPx: number;
    defaultMinHeightPx: number;
  };
  /** Панель настроек */
  settingsPanel: {
    closeAnimationMs: number;
    reactionTimeout: { min: number; max: number };
    emotionality: { min: number; max: number };
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
  session: {
    bottomPanelOffsetPx: 120,
  },
  draggablePanel: {
    paddingPx: 8,
    gapPx: 12,
    defaultMinWidthPx: 200,
    defaultMinHeightPx: 120,
  },
  settingsPanel: {
    closeAnimationMs: 200,
    reactionTimeout: { min: 1, max: 120 },
    emotionality: { min: 1, max: 100 },
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
