import { useState } from "react";

export type DialogMessage = { role: "user" | "model"; text: string };

const MAX_DIALOG_MESSAGES = 20;

export function useLiveSessionDialog() {
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [inputTranscription, setInputTranscription] = useState("");
  const [outputTranscription, setOutputTranscription] = useState("");

  const clearDialog = () => {
    setMessages([]);
    setInputTranscription("");
    setOutputTranscription("");
  };

  return {
    messages,
    setMessages,
    inputTranscription,
    setInputTranscription,
    outputTranscription,
    setOutputTranscription,
    clearDialog,
    maxDialogMessages: MAX_DIALOG_MESSAGES,
  };
}
