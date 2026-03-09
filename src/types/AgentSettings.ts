export type Tone = "friendly" | "neutral" | "aggressive";

/** Строки системной инструкции (как в translations), опционально переопределяются у личности. Поддерживают {items}, {seconds}, {emotionality}. */
export type PersonalitySysInstructionOverrides = {
  sysInstructionToneFriendly?: string;
  sysInstructionToneNeutral?: string;
  sysInstructionToneAggressive?: string;
  sysInstructionProfanityAllowed?: string;
  sysInstructionProfanityDisabled?: string;
  sysInstructionEmotionality?: string;
  sysInstructionMemory?: string;
};

/** Конфиг по языку: название, промпт и опциональные строки системной инструкции для этой личности */
export type PersonalityLangConfig = {
  name: string;
  prompt: string;
} & Partial<PersonalitySysInstructionOverrides>;

/** Дефолтная личность из конфига: id и config по языкам (ключ — код языка, по умолчанию ru) */
export type DefaultPersonality = {
  id: string;
  voiceName?: string;
  config: {
    [key: string]: PersonalityLangConfig;
  };
};

export type AgentSettings = {
  microphone: boolean;
  screenShare: boolean;
  camera: boolean;
  personality: string;
  voiceId: string;
  tone: Tone;
  allowProfanity: boolean;
  personalityPrompt: string;
  reactionTimeoutSeconds: number;
  emotionality: number;
};
