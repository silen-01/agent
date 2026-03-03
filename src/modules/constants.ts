import type { AgentSettings, DefaultPersonality } from "@types";
import { getPersonalityByLang } from "./helpers.ts";

const DEFAULT_LANG = "ru";

/** Дефолтные личности: id и config по языкам (язык по умолчанию — см. language.defaultLang) */
const PERSONALITIES: DefaultPersonality[] = [
  {
    id: "jarvis",
    config: {
      en: {
        name: "Jarvis",
        prompt: "You are a voice assistant in the style of Jarvis: restrained, competent, with light humor.",
      },
      ru: {
        name: "Джарвис",
        prompt: "Ты — голосовой ассистент в стиле Джарвиса: сдержанный, компетентный, с лёгким юмором.",
      },
    },
  },
  {
    id: "assistant",
    config: {
      en: { name: "Assistant", prompt: "You are a helpful voice assistant." },
      ru: { name: "Ассистент", prompt: "Ты — полезный голосовой ассистент." },
    },
  },
  {
    id: "custom",
    config: {
      en: { name: "Custom", prompt: "" },
      ru: { name: "Свой", prompt: "" },
    },
  },
];

/** Константы приложения (не зависят от окружения). Конфиг (токены, env) — в config.ts */
export const constants = {
  personalities: PERSONALITIES,
  controls: {
    cameraEnabled: false,
  },
  session: {
    bottomPanelOffsetPx: 120,
    /** Отступ панелей от краёв экрана (px) */
    panelMarginPx: 24,
    /** Размеры панели «Диалог» по умолчанию (px) */
    defaultDialogSizePx: { width: 22 * 16, height: 18 * 16 },
    /** Размеры панели «Память» по умолчанию (px) */
    defaultMemorySizePx: { width: 20 * 16, height: 16 * 16 },
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
      personality: PERSONALITIES[0].id,
      tone: "friendly",
      allowProfanity: false,
      personalityPrompt: getPersonalityByLang(PERSONALITIES, DEFAULT_LANG, PERSONALITIES[0].id, DEFAULT_LANG).prompt,
      reactionTimeoutSeconds: 30,
      emotionality: 50,
    } satisfies AgentSettings,
  },
  toast: {
    visibleMs: 2000,
    exitMs: 350,
  },
  language: {
    storageKey: "agent_lang",
    /** Язык по умолчанию (при первом запуске и fallback для личностей) */
    defaultLang: DEFAULT_LANG,
  },
  /** Память ИИ (факты о пользователе для системной инструкции) */
  memory: {
    storageKey: "agent_memory",
  },
} as const;
