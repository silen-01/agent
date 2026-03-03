export type Tone = "friendly" | "neutral" | "aggressive";

/** Конфиг по языку: название и промпт */
export type PersonalityLangConfig = {
  name: string;
  prompt: string;
};

/** Дефолтная личность из конфига: id и config по языкам (ключ — код языка, по умолчанию ru) */
export type DefaultPersonality = {
  id: string;
  config: {
    [key: string]: PersonalityLangConfig;
  };
};

export type AgentSettings = {
  microphone: boolean;
  screenShare: boolean;
  camera: boolean;
  personality: string;
  tone: Tone;
  allowProfanity: boolean;
  personalityPrompt: string;
  reactionTimeoutSeconds: number;
  emotionality: number;
};
