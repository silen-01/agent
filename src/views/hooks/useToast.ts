import { useState, useEffect } from "react";
import { constants } from "@modules";

export const useToast = () => {
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setToastExiting(false);
    const timer = setTimeout(() => setToastExiting(true), constants.toast.visibleMs);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!toastExiting) return;
    const timer = setTimeout(() => {
      setToast(null);
      setToastExiting(false);
    }, constants.toast.exitMs);
    return () => clearTimeout(timer);
  }, [toastExiting]);

  const showToast = (message: string) => {
    setToast(message);
    setToastExiting(false);
  };

  return { toast, toastExiting, showToast };
};
