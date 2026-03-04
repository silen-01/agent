import type { AgentSettings, DefaultPersonality, PersonalityLangConfig } from "@types";
import type { TranslationKey } from "./language/translations.ts";

/** Конфиг личности по языку (включая опциональные sysInstruction*); если язык не найден — defaultLang */
export const getPersonalityByLang = (
  personalities: DefaultPersonality[],
  defaultLang: string,
  personalityId: string,
  lang: string
): PersonalityLangConfig => {
  const p = personalities.find((x) => x.id === personalityId);
  if (!p) return { name: personalityId, prompt: "" };
  const langConfig = p.config[lang] ?? p.config[defaultLang];
  return langConfig ?? { name: p.id, prompt: "" };
};

/** Голос личности для Gemini (если задан voiceName у личности). */
export const getPersonalityVoiceName = (
  personalities: DefaultPersonality[],
  personalityId: string
): string | undefined => personalities.find((x) => x.id === personalityId)?.voiceName;

/** Подставить в строку плейсхолдеры {seconds}, {emotionality}, {items}. */
function fillPlaceholders(
  template: string,
  opts: { seconds: number; emotionality: number; items: string }
): string {
  return template
    .replace("{seconds}", String(opts.seconds))
    .replace("{emotionality}", String(opts.emotionality))
    .replace("{items}", opts.items);
}

/** Собрать системную инструкцию для ИИ: конфиг личности (lang) + дефолты из t() + настройки. */
export const buildSystemInstruction = (
  settings: AgentSettings,
  memoryItems: string[],
  t: (key: TranslationKey) => string,
  lang: string,
  personalities: DefaultPersonality[],
  defaultLang: string
): string => {
  const config = getPersonalityByLang(personalities, defaultLang, settings.personality, lang);
  const parts: string[] = [];
  if (settings.personalityPrompt) parts.push(settings.personalityPrompt);

  const toneKey = `sysInstructionTone${settings.tone.charAt(0).toUpperCase() + settings.tone.slice(1)}` as TranslationKey;
  const toneLine =
    (settings.tone === "friendly"
      ? config.sysInstructionToneFriendly
      : settings.tone === "neutral"
        ? config.sysInstructionToneNeutral
        : config.sysInstructionToneAggressive) ?? t(toneKey);
  parts.push(toneLine);

  const profanityLine =
    (settings.allowProfanity ? config.sysInstructionProfanityAllowed : config.sysInstructionProfanityDisabled) ??
    t(settings.allowProfanity ? "sysInstructionProfanityAllowed" : "sysInstructionProfanityDisabled");
  parts.push(profanityLine);

  const reactionTemplate = config.sysInstructionReaction ?? t("sysInstructionReaction");
  parts.push(
    fillPlaceholders(reactionTemplate, {
      seconds: settings.reactionTimeoutSeconds,
      emotionality: settings.emotionality,
      items: "",
    })
  );

  if (memoryItems.length > 0) {
    const memoryTemplate = config.sysInstructionMemory ?? t("sysInstructionMemory");
    parts.push(fillPlaceholders(memoryTemplate, { seconds: 0, emotionality: 0, items: memoryItems.join("; ") }));
  }
  return parts.join("\n");
};
