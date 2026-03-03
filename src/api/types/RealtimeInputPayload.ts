/** Полезная нагрузка для отправки в реальном времени */
export type RealtimeInputPayload =
  | { text: string }
  | { media: Blob }
  | { media: { data: string; mimeType: string } };
