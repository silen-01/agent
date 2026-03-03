import type { AgentSettings, DefaultPersonality } from "@types";
import type { TranslationKey } from "./language/translations.ts";

/** Конфиг личности по языку; если язык не найден — defaultLang */
export const getPersonalityByLang = (
  personalities: DefaultPersonality[],
  defaultLang: string,
  personalityId: string,
  lang: string
): { name: string; prompt: string } => {
  const p = personalities.find((x) => x.id === personalityId);
  if (!p) return { name: personalityId, prompt: "" };
  const langConfig = p.config[lang] ?? p.config[defaultLang];
  return langConfig ?? { name: p.id, prompt: "" };
};

/** Собрать системную инструкцию для ИИ по настройкам, памяти и переводам (язык = выбранный пользователем). */
export const buildSystemInstruction = (
  settings: AgentSettings,
  memoryItems: string[],
  t: (key: TranslationKey) => string
): string => {
  const parts: string[] = [];
  if (settings.personalityPrompt) parts.push(settings.personalityPrompt);
  const toneKey = `sysInstructionTone${settings.tone.charAt(0).toUpperCase() + settings.tone.slice(1)}` as TranslationKey;
  parts.push(t(toneKey));
  parts.push(t(settings.allowProfanity ? "sysInstructionProfanityAllowed" : "sysInstructionProfanityDisabled"));
  parts.push(
    t("sysInstructionReaction")
      .replace("{seconds}", String(settings.reactionTimeoutSeconds))
      .replace("{emotionality}", String(settings.emotionality))
  );
  if (memoryItems.length > 0) {
    parts.push(t("sysInstructionMemory").replace("{items}", memoryItems.join("; ")));
  }
  return parts.join("\n");
};
