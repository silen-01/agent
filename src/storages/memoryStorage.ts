import { constants, getMemoryItemCanonical, getMemoryItemDedupKey } from "@modules";

export const loadMemoryItems = (): string[] => {
  try {
    const saved = localStorage.getItem(constants.memory.storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const raw = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const s of raw) {
        const canonical = getMemoryItemCanonical(s);
        if (!canonical) continue;
        const key = getMemoryItemDedupKey(canonical);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(canonical);
        }
      }
      return out;
    }
  } catch (e) {
    console.warn("Failed to load AI memory from localStorage", e);
  }
  return [];
};

export const saveMemoryItems = (items: string[]): void => {
  try {
    localStorage.setItem(constants.memory.storageKey, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save AI memory to localStorage", e);
  }
};
