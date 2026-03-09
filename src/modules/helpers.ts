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

/** Нормализованные слова для сравнения (lowercase, только буквы/цифры, без пустых). */
function getMemoryWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Похожесть двух фактов по словам: 0..1 (Jaccard). */
function memoryItemSimilarity(a: string, b: string): number {
  const wa = getMemoryWords(a);
  const wb = getMemoryWords(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const setB = new Set(wb);
  const inter = wa.filter((w) => setB.has(w)).length;
  const union = wa.length + wb.length - inter;
  return union > 0 ? inter / union : 0;
}

/** Один факт — подстрока другого (после нормализации в строку слов). */
function oneIsSubstringOfOther(a: string, b: string): boolean {
  const na = getMemoryWords(a).join(" ");
  const nb = getMemoryWords(b).join(" ");
  if (na.length < 8 || nb.length < 8) return false;
  return na.includes(nb) || nb.includes(na);
}

/** Ключ для дедупликации памяти: нормализованная строка (trim, пробелы, без пунктуации по краям, lowercase). */
export const getMemoryItemDedupKey = (item: string): string => {
  const s = item
    .trim()
    .replace(/\s{2,}/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/^[.,;:!?\s]+/g, "");
  return s.toLowerCase();
};

/** Канонический вид пункта памяти для хранения (trim, пробелы, без завершающей пунктуации). */
export const getMemoryItemCanonical = (item: string): string => {
  return item.trim().replace(/\s{2,}/g, " ").replace(/[.,;:!?]+$/g, "");
};

/** Порог похожести слов (Jaccard): выше — считаем дубликатом. */
const MEMORY_SIMILARITY_THRESHOLD = 0.65;

/** Уже есть в списке или слишком похож на существующий пункт? */
export function isMemoryItemDuplicate(item: string, existingItems: string[]): boolean {
  const canonical = getMemoryItemCanonical(item);
  if (!canonical) return true;
  const key = getMemoryItemDedupKey(canonical);
  for (const existing of existingItems) {
    if (getMemoryItemDedupKey(existing) === key) return true;
    if (memoryItemSimilarity(canonical, existing) >= MEMORY_SIMILARITY_THRESHOLD) return true;
    if (oneIsSubstringOfOther(canonical, existing)) return true;
  }
  return false;
}

/** Извлечь из текста ответа ИИ факты в формате [MEMORY: факт]. Возвращает уникальные по ключу дедупликации строки в каноническом виде. */
export const extractMemoryItemsFromText = (text: string): string[] => {
  const re = /\[MEMORY:\s*([^\]]+)\]/gi;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    const canonical = getMemoryItemCanonical(raw);
    const key = getMemoryItemDedupKey(canonical);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(canonical);
    }
  }
  return out;
};

/** Заменить в тексте [MEMORY: факт] на сам факт (для отображения в диалоге — маркер убирается, содержание остаётся). */
export const stripMemoryMarkersFromText = (text: string): string => {
  return text.replace(/\[\s*MEMORY\s*:\s*([^\]]+)\]/gi, "$1").replace(/\s{2,}/g, " ").trim();
};

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

  // Один блок памяти: правило сохранения + при наличии — список сохранённого (без дублирования заголовка)
  const memoryProactive = t("sysInstructionMemoryProactive");
  if (memoryItems.length > 0) {
    const memoryListTemplate = config.sysInstructionMemory ?? t("sysInstructionMemory");
    const memoryList = fillPlaceholders(memoryListTemplate, { seconds: 0, emotionality: 0, items: memoryItems.join("; ") });
    parts.push(`${memoryProactive}\n${memoryList}`);
  } else {
    parts.push(memoryProactive);
  }

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

  const emotionalityTemplate = config.sysInstructionEmotionality ?? t("sysInstructionEmotionality");
  parts.push(
    fillPlaceholders(emotionalityTemplate, {
      seconds: 0,
      emotionality: settings.emotionality,
      items: "",
    })
  );

  return parts.join("\n");
};
