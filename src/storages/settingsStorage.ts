import Joi from "joi";
import type { AgentSettings } from "@types";
import { constants } from "@modules";

const def = constants.agentSettings.default;
const { reactionTimeout, emotionality } = constants.settingsPanel;
const personalityIds = constants.personalities.map((p) => p.id);

const settingsSchema = Joi.object<AgentSettings>({
  microphone: Joi.boolean().default(def.microphone),
  screenShare: Joi.boolean().default(def.screenShare),
  camera: Joi.boolean().default(def.camera),
  personality: Joi.string()
    .valid(...personalityIds)
    .default(def.personality),
  tone: Joi.string()
    .valid("friendly", "neutral", "aggressive")
    .default(def.tone),
  allowProfanity: Joi.boolean().default(def.allowProfanity),
  personalityPrompt: Joi.string().default(def.personalityPrompt),
  reactionTimeoutSeconds: Joi.number()
    .min(reactionTimeout.min)
    .max(reactionTimeout.max)
    .default(def.reactionTimeoutSeconds),
  emotionality: Joi.number()
    .min(emotionality.min)
    .max(emotionality.max)
    .default(def.emotionality),
});

/** Валидирует данные из localStorage и возвращает настройки (невалидные поля заменяются дефолтом). */
function validateSettings(parsed: unknown): AgentSettings {
  if (parsed == null || typeof parsed !== "object") return { ...def };
  const { value, error } = settingsSchema.validate(parsed, {
    stripUnknown: true,
    abortEarly: true,
    convert: true,
  });
  if (error) {
    console.warn("Settings validation failed, using defaults", error.message);
    return { ...def };
  }
  return value as AgentSettings;
}

export const loadSettings = (): AgentSettings => {
  try {
    const saved = localStorage.getItem(constants.agentSettings.storageKey);
    if (saved) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(saved);
      } catch {
        return { ...def };
      }
      return validateSettings(parsed);
    }
  } catch (e) {
    console.warn("Failed to load settings from localStorage", e);
  }
  return { ...def };
};

export const saveSettings = (settings: AgentSettings): void => {
  try {
    localStorage.setItem(constants.agentSettings.storageKey, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings to localStorage", e);
  }
};
