/** Частота PCM входа для Gemini Live API (16 kHz моно) */
export const PCM_SAMPLE_RATE = 16000;
/** Размер батча сэмплов при отправке — меньше вызовов API */
export const PCM_INPUT_BATCH_SAMPLES = 4096;
/** Частота выходного аудио модели (24 kHz) */
export const OUTPUT_SAMPLE_RATE = 24000;

/** Медиа-объект для sendRealtimeInput: base64 + mimeType */
export type PcmMedia = { data: string; mimeType: string };

// --- base64 ---

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

// --- PCM ↔ Web Audio ---

/** Декодирует сырой PCM16 (base64 → bytes) в AudioBuffer для воспроизведения */
export const decodePcmToBuffer = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> => {
  const byteLen = data.byteLength & 0xfffffffe; // чётное кол-во байт под PCM16
  if (byteLen === 0) return ctx.createBuffer(numChannels, 0, sampleRate);
  const int16 = new Int16Array(data.buffer, data.byteOffset, byteLen / 2);
  const frameCount = Math.floor(int16.length / numChannels);
  if (frameCount <= 0) return ctx.createBuffer(numChannels, 0, sampleRate);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const channel = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) channel[i] = int16[i * numChannels + ch] / 32768;
  }
  return buffer;
};

/** Float32 с микрофона → объект { data, mimeType } для sendRealtimeInput */
export const createPcmBlob = (samples: Float32Array): PcmMedia => {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return {
    data: uint8ArrayToBase64(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${PCM_SAMPLE_RATE}`,
  };
};
