import { useState, useRef, useEffect } from "react";
import { Wifi, Brain, MessageSquare, BookOpen, Volume2, Mic, Monitor } from "lucide-react";
import { language, constants } from "@modules";
import type { ScreenCaptureSettings } from "../hooks/useAgentSession";

/** Усиление микрофона: 0.5–4 (в UI показывается как 50–400%) */
export const MIC_SENSITIVITY_MIN = 50;
export const MIC_SENSITIVITY_MAX = 400;

/** Статус соединения с ИИ для индикатора на нижней панели */
export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type SessionStatusBarProps = {
  networkLoadPercent?: number;
  /** Подключен (синий) / Переподключение (оранжевый) / Соединение разорвано (красный) */
  connectionStatus?: ConnectionStatus;
  /** Громкость вывода ИИ 0–100 */
  aiVolumePercent?: number;
  onAiVolumeChange?: (percent: number) => void;
  /** Чувствительность микрофона: множитель 0.5–4 (в слайдере 50–400%) */
  micSensitivity?: number;
  onMicSensitivityChange?: (multiplier: number) => void;
  /** Версия приложения (справа) */
  version?: string;
  /** Вкладки: показать/скрыть панели Диалог и Память (по центру панели) */
  dialogVisible?: boolean;
  memoryVisible?: boolean;
  onDialogTabToggle?: () => void;
  onMemoryTabToggle?: () => void;
  /** Настройки трансляции экрана (для панели по клику на иконку монитора) */
  screenCaptureSettings?: ScreenCaptureSettings;
  onScreenCaptureSettingsChange?: (patch: Partial<ScreenCaptureSettings>) => void;
};

export const SessionStatusBar = ({
  networkLoadPercent = 0,
  connectionStatus = "connected",
  aiVolumePercent = 80,
  onAiVolumeChange,
  micSensitivity = 1,
  onMicSensitivityChange,
  version,
  dialogVisible = false,
  memoryVisible = false,
  onDialogTabToggle,
  onMemoryTabToggle,
  screenCaptureSettings,
  onScreenCaptureSettingsChange,
}: SessionStatusBarProps) => {
  const { t } = language.useLanguage();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showMicSlider, setShowMicSlider] = useState(false);
  const [showScreenCapturePanel, setShowScreenCapturePanel] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const micRef = useRef<HTMLDivElement>(null);
  const screenCaptureRef = useRef<HTMLDivElement>(null);
  const presets = constants.session.screenCapturePresets;

  const micSensitivityPercent = Math.round(micSensitivity * 100);

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

  useEffect(() => {
    if (!showMicSlider) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (micRef.current && !micRef.current.contains(e.target as Node)) {
        setShowMicSlider(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMicSlider]);

  useEffect(() => {
    if (!showScreenCapturePanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (screenCaptureRef.current && !screenCaptureRef.current.contains(e.target as Node)) {
        setShowScreenCapturePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showScreenCapturePanel]);

  const currentPresetId =
    screenCaptureSettings && presets.find((p) => p.width === screenCaptureSettings.width && p.height === screenCaptureSettings.height)
      ? `${screenCaptureSettings.width}x${screenCaptureSettings.height}`
      : presets[0]?.id ?? "768x432";

  return (
    <div className="shrink-0 relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#111827] border border-gray-700">
      <div className="flex items-center justify-center gap-2 min-w-0 flex-1 sm:justify-start">
        <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-0">
        {onAiVolumeChange != null && (
          <div className="relative shrink-0" ref={volumeRef}>
            <button
              type="button"
              onClick={() => setShowVolumeSlider((v) => !v)}
              className="flex items-center justify-center p-1.5 sm:p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition touch-manipulation"
              title={t("sessionAiVolume")}
              aria-label={t("sessionAiVolume")}
              aria-expanded={showVolumeSlider}
            >
              <Volume2 size={20} className="sm:w-[18px] sm:h-[18px]" />
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
        {onMicSensitivityChange != null && (
          <div className="relative shrink-0" ref={micRef}>
            <button
              type="button"
              onClick={() => setShowMicSlider((v) => !v)}
              className="flex items-center justify-center p-1.5 sm:p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition touch-manipulation"
              title={t("sessionMicSensitivity")}
              aria-label={t("sessionMicSensitivity")}
              aria-expanded={showMicSlider}
            >
              <Mic size={20} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            {showMicSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-5 rounded-xl bg-[#111827] border border-gray-700 shadow-xl z-50 p-3 flex flex-col items-center gap-2 w-[3rem]">
                <div className="text-xs text-gray-500 tabular-nums">{micSensitivityPercent}%</div>
                <div className="session-status-volume-track">
                  <input
                    type="range"
                    min={MIC_SENSITIVITY_MIN}
                    max={MIC_SENSITIVITY_MAX}
                    value={micSensitivityPercent}
                    onChange={(e) => onMicSensitivityChange(Number(e.target.value) / 100)}
                    onClick={(e) => e.stopPropagation()}
                    className="session-status-volume-slider"
                    aria-label={t("sessionMicSensitivity")}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {onScreenCaptureSettingsChange != null && screenCaptureSettings != null && (
          <div className="relative shrink-0" ref={screenCaptureRef}>
            <button
              type="button"
              onClick={() => setShowScreenCapturePanel((v) => !v)}
              className="flex items-center justify-center p-1.5 sm:p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition touch-manipulation"
              title={t("sessionScreenCaptureTitle")}
              aria-label={t("sessionScreenCaptureTitle")}
              aria-expanded={showScreenCapturePanel}
            >
              <Monitor size={20} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            {showScreenCapturePanel && (
              <div className="absolute bottom-full left-0 mb-5 rounded-xl bg-[#111827] border border-gray-700 shadow-xl z-50 p-4 w-64">
                <h3 className="text-sm font-semibold text-white mb-3">{t("sessionScreenCaptureTitle")}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t("sessionScreenCaptureResolution")}</label>
                    <select
                      value={currentPresetId}
                      onChange={(e) => {
                        const p = presets.find((x) => x.id === e.target.value);
                        if (p) onScreenCaptureSettingsChange({ width: p.width, height: p.height });
                      }}
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white text-sm px-2 py-1.5"
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.width}×{p.height}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t("sessionScreenCaptureQuality")} — {Math.round((screenCaptureSettings.jpegQuality ?? 0.7) * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((screenCaptureSettings.jpegQuality ?? 0.7) * 100)}
                      onChange={(e) => onScreenCaptureSettingsChange({ jpegQuality: Number(e.target.value) / 100 })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t("sessionScreenCaptureFps")} — {screenCaptureSettings.fps ?? 4}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={screenCaptureSettings.fps ?? 4}
                      onChange={(e) => onScreenCaptureSettingsChange({ fps: Number(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t("sessionScreenCaptureSkipStatic")} — {Math.round(((screenCaptureSettings.motionThreshold ?? 0) / 0.15) * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(((screenCaptureSettings.motionThreshold ?? 0) / 0.15) * 100)}
                      onChange={(e) => onScreenCaptureSettingsChange({ motionThreshold: (Number(e.target.value) / 100) * 0.15 })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">{t("sessionScreenCaptureSkipStaticHint")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div
          className="flex items-center shrink-0"
          title={
            connectionStatus === "connected"
              ? t("sessionStatusAiConnected")
              : connectionStatus === "reconnecting"
                ? t("sessionStatusAiReconnecting")
                : t("sessionStatusAiDisconnected")
          }
          aria-label={
            connectionStatus === "connected"
              ? t("sessionStatusAiConnected")
              : connectionStatus === "reconnecting"
                ? t("sessionStatusAiReconnecting")
                : t("sessionStatusAiDisconnected")
          }
        >
          <Brain
            size={20}
            className={`sm:w-[18px] sm:h-[18px] ${
              connectionStatus === "connected"
                ? "text-blue-400"
                : connectionStatus === "reconnecting"
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          />
        </div>
        <div
          className="flex items-center shrink-0"
          title={`${t("sessionStatusNetwork")}: ${networkLoadPercent}%`}
          aria-label={`${t("sessionStatusNetwork")}: ${networkLoadPercent}%`}
        >
          <Wifi
            size={20}
            className={`sm:w-[18px] sm:h-[18px] ${
              networkLoadPercent <= 33
                ? "text-emerald-400"
                : networkLoadPercent <= 66
                  ? "text-amber-400"
                  : "text-red-400"
            }`            }
          />
        </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 shrink-0 order-last sm:order-none sm:absolute sm:left-1/2 sm:-translate-x-1/2">
        <button
          type="button"
          onClick={onDialogTabToggle}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition touch-manipulation ${
            dialogVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("sessionDialogTitle")}
        >
          <MessageSquare size={18} className="shrink-0 sm:w-4 sm:h-4" />
          <span className="truncate">{t("sessionDialogTitle")}</span>
        </button>
        <button
          type="button"
          onClick={onMemoryTabToggle}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition touch-manipulation ${
            memoryVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("memoryTitle")}
        >
          <BookOpen size={18} className="shrink-0 sm:w-4 sm:h-4" />
          <span className="truncate">{t("memoryTitle")}</span>
        </button>
      </div>
      <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1 justify-end">
        {version != null && version !== "" && (
          <span className="text-xs text-gray-500 tabular-nums shrink-0">v{version}</span>
        )}
      </div>
      {version != null && version !== "" && (
        <span className="absolute right-2 bottom-2 text-[10px] text-gray-500 tabular-nums shrink-0 sm:hidden" aria-hidden>
          v{version}
        </span>
      )}
    </div>
  );
};
