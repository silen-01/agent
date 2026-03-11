import { useCallback, useRef, useEffect } from "react";
import { stripMemoryMarkersFromText } from "@modules";
import type { LiveMessagePayload } from "../types/index.ts";
import { useLiveSessionAudio } from "./liveSession/useLiveSessionAudio.ts";
import { useLiveSessionDialog } from "./liveSession/useLiveSessionDialog.ts";
import { useLiveSessionMemory } from "./liveSession/useLiveSessionMemory.ts";
import { useLiveSessionConnection } from "./liveSession/useLiveSessionConnection.ts";

export type UseLiveSessionOptions = {
  onMemoryItemExtracted?: (item: string) => void;
};

export type DialogMessage = { role: "user" | "model"; text: string };

function estimateMessageTransportBytes(message: LiveMessagePayload): number {
  try {
    const json = JSON.stringify(message);
    return json ? new TextEncoder().encode(json).length : 0;
  } catch {
    return 0;
  }
}

export const useLiveSession = (options: UseLiveSessionOptions = {}) => {
  const audio = useLiveSessionAudio();
  const dialog = useLiveSessionDialog();
  const memory = useLiveSessionMemory(options.onMemoryItemExtracted);
  const handleMessageRef = useRef<(msg: LiveMessagePayload) => void>(() => {});

  const connection = useLiveSessionConnection({
    handleMessageRef,
    onDisconnect: () => {
      dialog.clearDialog();
      audio.cleanup();
    },
    onSessionRestored: () => {
      dialog.setInputTranscription((userText) => {
        dialog.setOutputTranscription((modelText) => {
          const toAdd: DialogMessage[] = [];
          if (userText.trim()) toAdd.push({ role: "user", text: userText.trim() });
          if (modelText.trim())
            toAdd.push({ role: "model", text: stripMemoryMarkersFromText(modelText.trim()) });
          if (toAdd.length) {
            dialog.setMessages((prev) =>
              [...prev, ...toAdd].slice(-dialog.maxDialogMessages)
            );
          }
          return "";
        });
        return "";
      });
    },
  });

  const handleMessage = useCallback(
    (message: LiveMessagePayload) => {
      connection.markSessionReady();
      connection.recordReceivedBytes(estimateMessageTransportBytes(message));
      const hasModelOutput =
        message.outputTranscription?.text !== undefined ||
        (message.modelTurn?.parts?.length ?? 0) > 0 ||
        (message.audioChunks?.length ?? 0) > 0;
      if (hasModelOutput) connection.markModelActivity();

      if (message.interrupted) {
        audio.stopAllPlayback();
        memory.resetTurn();
      }
      if (message.turnComplete) {
        dialog.setInputTranscription((userText) => {
          dialog.setOutputTranscription((modelText) => {
            const toAdd: DialogMessage[] = [];
            if (userText.trim()) toAdd.push({ role: "user", text: userText.trim() });
            if (modelText.trim())
              toAdd.push({ role: "model", text: stripMemoryMarkersFromText(modelText.trim()) });
            if (toAdd.length) {
              dialog.setMessages((prev) =>
                [...prev, ...toAdd].slice(-dialog.maxDialogMessages)
              );
            }
            return "";
          });
          return "";
        });
        memory.resetTurn();
      }
      if (message.inputTranscription?.text !== undefined) {
        dialog.setInputTranscription((prev) => prev + message.inputTranscription!.text);
      }
      if (message.outputTranscription?.text !== undefined) {
        memory.processOutputChunk(message.outputTranscription.text);
        dialog.setOutputTranscription((prev) => prev + message.outputTranscription!.text);
      }
      if (message.modelTurn?.parts) {
        for (const part of message.modelTurn.parts) {
          const data = part.inlineData?.data;
          if (!data) continue;
          audio.playAudioChunk(data).catch((e) => console.warn("Output audio play failed:", e));
        }
      }
      if (message.audioChunks?.length) {
        for (const chunk of message.audioChunks) {
          if (chunk.data) {
            audio.playAudioChunk(chunk.data).catch((e) =>
              console.warn("Output audio play failed:", e)
            );
          }
        }
      }
    },
    [connection, dialog, memory, audio]
  );

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  return {
    session: connection.session,
    sessionReady: connection.sessionReady,
    isSpeaking: audio.isSpeaking,
    messages: dialog.messages,
    inputTranscription: dialog.inputTranscription,
    outputTranscription: dialog.outputTranscription,
    isConnecting: connection.isConnecting,
    hasHadSession: connection.hasHadSession,
    connectionError: connection.connectionError,
    setConnectionError: connection.setConnectionError,
    setOutputVolume: audio.setOutputVolume,
    stopAllPlayback: audio.stopAllPlayback,
    unlockOutputAudio: audio.unlockOutputAudio,
    networkLoadPercent: connection.networkLoadPercent,
    networkTrafficStats: connection.networkTrafficStats,
    launch: connection.launch,
    disconnect: connection.disconnect,
  };
};
