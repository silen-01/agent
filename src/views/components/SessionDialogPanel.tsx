import { useEffect, useRef, useState } from "react";
import { language } from "@modules";
import type { DialogMessage } from "../../api/hooks/index.ts";

export type SessionDialogPanelProps = {
  hideTitle?: boolean;
  /** Сохранённые сообщения диалога */
  messages?: DialogMessage[];
  /** Текст, который пользователь сейчас говорит (стриминг) */
  streamingUser?: string;
  /** Текст, который ИИ сейчас «печатает» (стриминг) */
  streamingModel?: string;
  /** Показывать «Слушаю…», когда сессия активна, но текста ещё нет */
  showListeningHint?: boolean;
};

/** Строка стриминга: один span для уже показанных слов, новые слова — отдельные span с анимацией. Меньше DOM и скролл только при росте. */
const StreamingLineWithWordEffect = ({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className: string;
}) => {
  const [prevWordCount, setPrevWordCount] = useState(0);
  const words = text.trim() ? text.trim().split(/\s+/) : [];

  useEffect(() => {
    const id = setTimeout(() => setPrevWordCount(words.length), 0);
    return () => clearTimeout(id);
  }, [words.length]);

  const newFrom = prevWordCount;
  const stableWords = words.slice(0, newFrom);
  const newWords = words.slice(newFrom);

  return (
    <p className={`mb-2 session-dialog-wrap ${className}`}>
      <span className="text-gray-500 font-medium shrink-0">{label}</span>
      <span className="session-dialog-wrap">
        {stableWords.length > 0 && (
          <span key={`${label}-stable-${newFrom}`} className="inline">
            {stableWords.join("\u00A0")}
            {newWords.length > 0 ? "\u00A0" : ""}
          </span>
        )}
        {newWords.map((word, i) => (
          <span
            key={`${label}-new-${newFrom + i}`}
            className="session-dialog-word-in inline"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {word}
            {i < newWords.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </span>
    </p>
  );
};

export const SessionDialogPanel = ({
  hideTitle = false,
  messages = [],
  streamingUser = "",
  streamingModel = "",
  showListeningHint = false,
}: SessionDialogPanelProps) => {
  const { t } = language.useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef(0);
  const hasContent = messages.length > 0 || streamingUser.trim() || streamingModel.trim();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    if (h > lastScrollHeightRef.current) {
      lastScrollHeightRef.current = h;
      el.scrollTo({ top: h, behavior: "auto" });
    }
  }, [messages.length, streamingUser, streamingModel]);

  return (
    <div className="min-w-0 min-h-0 flex flex-col flex-1">
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-2 shrink-0">{t("sessionDialogTitle")}</h2>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[80px] rounded-b-2xl border border-gray-700 border-t-0 bg-[#111827] p-3">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col text-sm py-2 gap-2 scrollbar-thin"
        >
          {!hasContent ? (
            <div className="text-gray-500 text-center py-4">
              {showListeningHint ? t("sessionDialogListening") : t("sessionDialogEmpty")}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <p
                  key={i}
                  className={`session-dialog-wrap ${msg.role === "user" ? "text-gray-400" : "text-gray-300"}`}
                >
                  <span className="text-gray-500 font-medium">
                    {msg.role === "user" ? `${t("sessionDialogYou")}: ` : `${t("sessionDialogAi")}: `}
                  </span>
                  {msg.text}
                </p>
              ))}
              {streamingUser.trim() && (
                <StreamingLineWithWordEffect
                  label={`${t("sessionDialogYou")}: `}
                  text={streamingUser}
                  className="text-gray-400"
                />
              )}
              {streamingModel.trim() && (
                <StreamingLineWithWordEffect
                  label={`${t("sessionDialogAi")}: `}
                  text={streamingModel}
                  className="text-gray-300"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
