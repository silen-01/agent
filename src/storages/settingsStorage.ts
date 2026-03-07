import type { AgentSettings } from "@types";
import { constants } from "@modules";
import { validateSettings } from "./settingsValidation.ts";

const def = constants.agentSettings.default;
const { reactionTimeout, emotionality } = constants.settingsPanel;

const settingsSchema = {
  default: def,
  personalityIds: constants.personalities.map((p) => p.id),
  voiceIds: constants.geminiVoices.map((v) => v.value),
  reactionTimeout: { min: reactionTimeout.min, max: reactionTimeout.max },
  emotionality: { min: emotionality.min, max: emotionality.max },
};

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
      return validateSettings(parsed, settingsSchema);
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
