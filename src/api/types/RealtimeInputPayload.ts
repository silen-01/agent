/** Блоб для аудио/медиа (base64 + mimeType) */
export type RealtimeBlob = { data: string; mimeType: string };

/** Полезная нагрузка для отправки в реальном времени */
export type RealtimeInputPayload =
  | { text: string }
  | { media: Blob | RealtimeBlob }
  | { audio: RealtimeBlob };
