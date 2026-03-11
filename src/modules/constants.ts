import type { AgentSettings } from "@types";
import { getPersonalityByLang, getPersonalityVoiceName } from "./helpers.ts";
import { GeminiVoice, GEMINI_VOICES } from "./geminiVoices.ts";
import { PERSONALITIES } from "./personalities.ts";

const DEFAULT_LANG = "ru";

// Re-export для обратной совместимости (импорты из @modules)
export { GeminiVoice, GEMINI_VOICES };
export type { GeminiVoiceOption } from "./geminiVoices.ts";

/** Константы приложения (не зависят от окружения). Конфиг (токены, env) — в config.ts */
export const constants = {
  personalities: PERSONALITIES,
  geminiVoices: GEMINI_VOICES,
  controls: {
    cameraEnabled: true,
  },
  session: {
    bottomPanelOffsetPx: 120,
    /** Отступ панелей от краёв экрана (px) */
    panelMarginPx: 24,
    /** Размеры панели «Диалог» по умолчанию (px) */
    defaultDialogSizePx: { width: 22 * 16, height: 18 * 16 },
    /** Размеры панели «Память» по умолчанию (px) */
    defaultMemorySizePx: { width: 20 * 16, height: 16 * 16 },
    /** Размеры панели «Что видит ИИ» (камера) по умолчанию (px), 16:9 */
    defaultCameraSizePx: { width: 400, height: 225 },
    /** Трансляция экрана в ИИ (только JPEG). Значения по умолчанию; в сессии можно менять через панель настроек. */
    screenCapture: {
      fps: 2,
      width: 768,
      height: 432,
      jpegQuality: 0.7,
      motionThreshold: 0.03,
    },
    /** Пресеты разрешений для трансляции экрана (выбор в панели настроек). */
    screenCapturePresets: [
      { id: "640x360", width: 640, height: 360 },
      { id: "768x432", width: 768, height: 432 },
      { id: "854x480", width: 854, height: 480 },
      { id: "1024x576", width: 1024, height: 576 },
    ] as const,
    /** Трансляция камеры в ИИ (JPEG). Те же параметры, что у экрана. */
    cameraCapture: {
      fps: 2,
      width: 640,
      height: 360,
      jpegQuality: 0.7,
      motionThreshold: 0.03,
      facingMode: "user",
    },
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
      microphone: false,
      screenShare: false,
      camera: false,
      personality: PERSONALITIES[0].id,
      voiceId: getPersonalityVoiceName(PERSONALITIES, PERSONALITIES[0].id) ?? GeminiVoice.Puck,
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
