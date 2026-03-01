export type PersonalityId = "jarvis" | "assistant" | "custom";
export type Tone = "friendly" | "neutral" | "aggressive";

export type AgentSettings = {
  microphone: boolean;
  screenShare: boolean;
  camera: boolean;
  personality: PersonalityId;
  tone: Tone;
  allowProfanity: boolean;
  personalityPrompt: string;
  reactionTimeoutSeconds: number;
  emotionality: number;
};
