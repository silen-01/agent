import { useState, useRef, useEffect } from "react";
import { Wifi, Brain, MessageSquare, BookOpen, Volume2 } from "lucide-react";
import { language } from "@modules";

export type SessionStatusBarProps = {
  networkLoadPercent?: number;
  aiStatus?: "ready" | "thinking";
  /** Громкость вывода ИИ 0–100 */
  aiVolumePercent?: number;
  onAiVolumeChange?: (percent: number) => void;
  /** Версия приложения (справа) */
  version?: string;
  /** Вкладки: показать/скрыть панели Диалог и Память (по центру панели) */
  dialogVisible?: boolean;
  memoryVisible?: boolean;
  onDialogTabToggle?: () => void;
  onMemoryTabToggle?: () => void;
};

export const SessionStatusBar = ({
  networkLoadPercent = 0,
  aiStatus = "ready",
  aiVolumePercent = 80,
  onAiVolumeChange,
  version,
  dialogVisible = false,
  memoryVisible = false,
  onDialogTabToggle,
  onMemoryTabToggle,
}: SessionStatusBarProps) => {
  const { t } = language.useLanguage();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVolumeSlider) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVolumeSlider]);

  return (
    <div className="shrink-0 relative flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#111827] border border-gray-700">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {onAiVolumeChange != null && (
          <div className="relative shrink-0" ref={volumeRef}>
            <button
              type="button"
              onClick={() => setShowVolumeSlider((v) => !v)}
              className="flex items-center justify-center p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition"
              title={t("sessionAiVolume")}
              aria-label={t("sessionAiVolume")}
              aria-expanded={showVolumeSlider}
            >
              <Volume2 size={18} />
            </button>
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-5 rounded-xl bg-[#111827] border border-gray-700 shadow-xl z-50 p-3 flex flex-col items-center gap-2 w-[3rem]">
                <div className="text-xs text-gray-500 tabular-nums">{aiVolumePercent}%</div>
                <div className="session-status-volume-track">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={aiVolumePercent}
                    onChange={(e) => onAiVolumeChange(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="session-status-volume-slider"
                    aria-label={t("sessionAiVolume")}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <Brain size={18} className="text-gray-400" />
          <span className="text-sm text-gray-400">{t("sessionStatusAi")}:</span>
          <span className="text-sm font-medium text-blue-400">
            {aiStatus === "thinking" ? t("sessionStatusAiThinking") : t("sessionStatusAiReady")}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Wifi size={18} className="text-gray-400" />
          <span className="text-sm text-gray-400">{t("sessionStatusNetwork")}:</span>
          <span className="text-sm font-medium tabular-nums text-gray-300">{networkLoadPercent}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 absolute left-1/2 -translate-x-1/2">
        <button
          type="button"
          onClick={onDialogTabToggle}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
            dialogVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("sessionDialogTitle")}
        >
          <MessageSquare size={16} className="shrink-0" />
          <span>{t("sessionDialogTitle")}</span>
        </button>
        <button
          type="button"
          onClick={onMemoryTabToggle}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
            memoryVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("memoryTitle")}
        >
          <BookOpen size={16} className="shrink-0" />
          <span>{t("memoryTitle")}</span>
        </button>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
        {version != null && version !== "" && (
          <span className="text-xs text-gray-500 tabular-nums shrink-0">v{version}</span>
        )}
      </div>
    </div>
  );
};
