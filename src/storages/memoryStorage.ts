import { constants } from "@modules";

export const loadMemoryItems = (): string[] => {
  try {
    const saved = localStorage.getItem(constants.memory.storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
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
