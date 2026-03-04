import type { LiveSendRealtimeInputParameters, Session } from "@google/genai";
import type { ILiveSession, RealtimeInputPayload } from "../types/index.ts";

export class GeminiSessionAdapter implements ILiveSession {
  private readonly session: Session;

  constructor(session: Session) {
    this.session = session;
  }

  sendRealtimeInput(payload: RealtimeInputPayload): void {
    try {
      this.session.sendRealtimeInput(payload as LiveSendRealtimeInputParameters);
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (msg.includes("closing") || msg.includes("closed") || msg.includes("websocket")) {
        return;
      }
      throw err;
    }
  }

  close(): void {
    this.session.close();
  }
}
