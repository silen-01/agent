import type { AgentSettings } from "@types";
import { config } from "@modules/config.ts";

export const loadSettings = (): AgentSettings => {
  try {
    const saved = localStorage.getItem(config.agentSettings.storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AgentSettings>;
      return { ...config.agentSettings.default, ...parsed };
    }
  } catch {}
  return { ...config.agentSettings.default };
};

export const saveSettings = (settings: AgentSettings): void => {
  try {
    localStorage.setItem(config.agentSettings.storageKey, JSON.stringify(settings));
  } catch {}
};
