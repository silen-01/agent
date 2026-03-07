import type { AgentSettings, Tone } from "@types";

export type SettingsSchema = {
  default: AgentSettings;
  personalityIds: string[];
  voiceIds: string[];
  reactionTimeout: { min: number; max: number };
  emotionality: { min: number; max: number };
};

const TONE_VALUES: readonly Tone[] = ["friendly", "neutral", "aggressive"];

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n) || n < min) return min;
  if (n > max) return max;
  return Math.round(n);
}

/**
 * Валидирует данные из localStorage: невалидные поля заменяются дефолтом.
 * Без внешних зависимостей (Joi и т.п.).
 */
export function validateSettings(parsed: unknown, schema: SettingsSchema): AgentSettings {
  const def = schema.default;
  if (!isObject(parsed)) return { ...def };

  const personalityIds = new Set(schema.personalityIds);
  const voiceIds = new Set(schema.voiceIds);
  const { reactionTimeout, emotionality } = schema;

  return {
    microphone: typeof parsed.microphone === "boolean" ? parsed.microphone : def.microphone,
    screenShare: typeof parsed.screenShare === "boolean" ? parsed.screenShare : def.screenShare,
    camera: typeof parsed.camera === "boolean" ? parsed.camera : def.camera,
    personality:
      typeof parsed.personality === "string" && personalityIds.has(parsed.personality)
        ? parsed.personality
        : def.personality,
    voiceId:
      typeof parsed.voiceId === "string" && voiceIds.has(parsed.voiceId)
        ? parsed.voiceId
        : def.voiceId,
    tone:
      typeof parsed.tone === "string" && (TONE_VALUES as readonly string[]).includes(parsed.tone)
        ? (parsed.tone as Tone)
        : def.tone,
    allowProfanity:
      typeof parsed.allowProfanity === "boolean" ? parsed.allowProfanity : def.allowProfanity,
    personalityPrompt:
      typeof parsed.personalityPrompt === "string" ? parsed.personalityPrompt : def.personalityPrompt,
    reactionTimeoutSeconds: (() => {
      const n = Number(parsed.reactionTimeoutSeconds);
      return Number.isNaN(n) ? def.reactionTimeoutSeconds : clamp(n, reactionTimeout.min, reactionTimeout.max);
    })(),
    emotionality: (() => {
      const n = Number(parsed.emotionality);
      return Number.isNaN(n) ? def.emotionality : clamp(n, emotionality.min, emotionality.max);
    })(),
  };
}
