import type { LiveSendRealtimeInputParameters, Session } from "@google/genai";
import type { ILiveSession, RealtimeInputPayload } from "../types/index.ts";

export class GeminiSessionAdapter implements ILiveSession {
  private readonly session: Session;

  constructor(session: Session) {
    this.session = session;
  }

  sendRealtimeInput(payload: RealtimeInputPayload): void {
    this.session.sendRealtimeInput(payload as LiveSendRealtimeInputParameters);
  }

  close(): void {
    this.session.close();
  }
}
