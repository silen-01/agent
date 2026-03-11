import { useState, useRef, useEffect } from "react";
import { Wifi, Brain, MessageSquare, BookOpen, Volume2, Mic, Monitor, Video } from "lucide-react";
import { language, constants } from "@modules";
import type { ScreenCaptureSettings, CameraCaptureSettings } from "../hooks/useAgentSession";
import { isLikelyPhoneDevice } from "../screenShareSupport.ts";

/** Усиление микрофона: 0.5–4 (в UI показывается как 50–400%) */
export const MIC_SENSITIVITY_MIN = 50;
export const MIC_SENSITIVITY_MAX = 400;

/** Статус соединения с ИИ для индикатора на нижней панели */
export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type SessionStatusBarProps = {
  networkLoadPercent?: number;
  networkTrafficStats?: {
    txBytesPerSecond: number;
    rxBytesPerSecond: number;
    totalBytesPerSecond: number;
  };
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
  /** Вкладки: показать/скрыть панели Диалог, Память, «Что видит ИИ» (по центру панели) */
  dialogVisible?: boolean;
  memoryVisible?: boolean;
  /** Показывать вкладку «Что видит ИИ» (камера и/или экран включены) */
  showPreviewTab?: boolean;
  cameraVisible?: boolean;
  onDialogTabToggle?: () => void;
  onMemoryTabToggle?: () => void;
  onCameraTabToggle?: () => void;
  /** Настройки трансляции экрана (для панели по клику на иконку монитора) */
  screenCaptureSettings?: ScreenCaptureSettings;
  onScreenCaptureSettingsChange?: (patch: Partial<ScreenCaptureSettings>) => void;
  /** Настройки трансляции камеры (для панели по клику на иконку камеры) */
  cameraCaptureSettings?: CameraCaptureSettings;
  onCameraCaptureSettingsChange?: (patch: Partial<CameraCaptureSettings>) => void;
};

function formatTrafficRate(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  }
  if (bytesPerSecond >= 1024) {
    const kbPerSecond = bytesPerSecond / 1024;
    return `${kbPerSecond >= 100 ? kbPerSecond.toFixed(0) : kbPerSecond.toFixed(1)} KB/s`;
  }
  return `${bytesPerSecond} B/s`;
}

export const SessionStatusBar = ({
  networkLoadPercent = 0,
  networkTrafficStats = {
    txBytesPerSecond: 0,
    rxBytesPerSecond: 0,
    totalBytesPerSecond: 0,
  },
  connectionStatus = "connected",
  aiVolumePercent = 80,
  onAiVolumeChange,
  micSensitivity = 1,
  onMicSensitivityChange,
  version,
  dialogVisible = false,
  memoryVisible = false,
  showPreviewTab = false,
  cameraVisible = false,
  onDialogTabToggle,
  onMemoryTabToggle,
  onCameraTabToggle,
  screenCaptureSettings,
  onScreenCaptureSettingsChange,
  cameraCaptureSettings,
  onCameraCaptureSettingsChange,
}: SessionStatusBarProps) => {
  const { t } = language.useLanguage();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showMicSlider, setShowMicSlider] = useState(false);
  const [showScreenCapturePanel, setShowScreenCapturePanel] = useState(false);
  const [showCameraCapturePanel, setShowCameraCapturePanel] = useState(false);
  const [showConnectionStatusPanel, setShowConnectionStatusPanel] = useState(false);
  const [showNetworkStatusPanel, setShowNetworkStatusPanel] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const micRef = useRef<HTMLDivElement>(null);
  const screenCaptureRef = useRef<HTMLDivElement>(null);
  const cameraCaptureRef = useRef<HTMLDivElement>(null);
  const connectionStatusRef = useRef<HTMLDivElement>(null);
  const networkStatusRef = useRef<HTMLDivElement>(null);
  const presets = constants.session.screenCapturePresets;

  const micSensitivityPercent = Math.round(micSensitivity * 100);
  const isPhoneDevice = isLikelyPhoneDevice();
  const connectionStatusLabel =
    connectionStatus === "connected"
      ? t("sessionStatusAiConnected")
      : connectionStatus === "reconnecting"
        ? t("sessionStatusAiReconnecting")
        : t("sessionStatusAiDisconnected");
  const connectionStatusColorClass =
    connectionStatus === "connected"
      ? "text-blue-400"
      : connectionStatus === "reconnecting"
        ? "text-amber-400"
        : "text-red-400";
  const networkStatusColorClass =
    networkLoadPercent <= 33
      ? "text-emerald-400"
      : networkLoadPercent <= 66
        ? "text-amber-400"
        : "text-red-400";
  const networkStatusFillClass =
    networkLoadPercent <= 33
      ? "bg-emerald-400"
      : networkLoadPercent <= 66
        ? "bg-amber-400"
        : "bg-red-400";

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

  useEffect(() => {
    if (!showCameraCapturePanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cameraCaptureRef.current && !cameraCaptureRef.current.contains(e.target as Node)) {
        setShowCameraCapturePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCameraCapturePanel]);

  useEffect(() => {
    if (!showConnectionStatusPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        connectionStatusRef.current &&
        !connectionStatusRef.current.contains(e.target as Node)
      ) {
        setShowConnectionStatusPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConnectionStatusPanel]);

  useEffect(() => {
    if (!showNetworkStatusPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (networkStatusRef.current && !networkStatusRef.current.contains(e.target as Node)) {
        setShowNetworkStatusPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNetworkStatusPanel]);

  const currentPresetId =
    screenCaptureSettings && presets.find((p) => p.width === screenCaptureSettings.width && p.height === screenCaptureSettings.height)
      ? `${screenCaptureSettings.width}x${screenCaptureSettings.height}`
      : presets[0]?.id ?? "768x432";

  const currentCameraPresetId =
    cameraCaptureSettings && presets.find((p) => p.width === cameraCaptureSettings.width && p.height === cameraCaptureSettings.height)
      ? `${cameraCaptureSettings.width}x${cameraCaptureSettings.height}`
      : presets[0]?.id ?? "640x360";
  const showCameraTab = showPreviewTab && onCameraTabToggle != null;

  return (
    <div className="shrink-0 relative flex flex-col gap-2 px-3 pt-2 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5 rounded-xl bg-[#111827] border border-gray-700">
      <div className="flex items-center justify-center gap-2 min-w-0 sm:flex-1 sm:justify-start">
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
        {onCameraCaptureSettingsChange != null && cameraCaptureSettings != null && (
          <div className="relative shrink-0" ref={cameraCaptureRef}>
            <button
              type="button"
              onClick={() => setShowCameraCapturePanel((v) => !v)}
              className="flex items-center justify-center p-1.5 sm:p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition touch-manipulation"
              title={t("sessionCameraCaptureTitle")}
              aria-label={t("sessionCameraCaptureTitle")}
              aria-expanded={showCameraCapturePanel}
            >
              <Video size={20} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            {showCameraCapturePanel && (
              <div className="absolute bottom-full left-1/2 z-50 mb-5 w-[min(16rem,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border border-gray-700 bg-[#111827] p-4 shadow-xl sm:left-0 sm:w-64 sm:translate-x-0">
                <h3 className="text-sm font-semibold text-white mb-3">{t("sessionCameraCaptureTitle")}</h3>
                <div className="space-y-3">
                  {isPhoneDevice && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t("sessionCameraFacingTitle")}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onCameraCaptureSettingsChange({ facingMode: "user" })}
                          className={`rounded-lg border px-2 py-1.5 text-sm transition ${
                            (cameraCaptureSettings.facingMode ?? "user") === "user"
                              ? "border-blue-500 bg-blue-500/15 text-white"
                              : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700/70"
                          }`}
                        >
                          {t("sessionCameraFacingFront")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCameraCaptureSettingsChange({ facingMode: "environment" })}
                          className={`rounded-lg border px-2 py-1.5 text-sm transition ${
                            (cameraCaptureSettings.facingMode ?? "user") === "environment"
                              ? "border-blue-500 bg-blue-500/15 text-white"
                              : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700/70"
                          }`}
                        >
                          {t("sessionCameraFacingRear")}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t("sessionScreenCaptureResolution")}</label>
                    <select
                      value={currentCameraPresetId}
                      onChange={(e) => {
                        const p = presets.find((x) => x.id === e.target.value);
                        if (p) onCameraCaptureSettingsChange({ width: p.width, height: p.height });
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
                      {t("sessionScreenCaptureQuality")} — {Math.round((cameraCaptureSettings.jpegQuality ?? 0.7) * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((cameraCaptureSettings.jpegQuality ?? 0.7) * 100)}
                      onChange={(e) => onCameraCaptureSettingsChange({ jpegQuality: Number(e.target.value) / 100 })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t("sessionScreenCaptureFps")} — {cameraCaptureSettings.fps ?? 2}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={cameraCaptureSettings.fps ?? 2}
                      onChange={(e) => onCameraCaptureSettingsChange({ fps: Number(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {t("sessionScreenCaptureSkipStatic")} — {Math.round(((cameraCaptureSettings.motionThreshold ?? 0) / 0.15) * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(((cameraCaptureSettings.motionThreshold ?? 0) / 0.15) * 100)}
                      onChange={(e) => onCameraCaptureSettingsChange({ motionThreshold: (Number(e.target.value) / 100) * 0.15 })}
                      className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-blue-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">{t("sessionScreenCaptureSkipStaticHint")}</p>
                  </div>
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
              <div className="absolute bottom-full left-1/2 z-50 mb-5 w-[min(16rem,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border border-gray-700 bg-[#111827] p-4 shadow-xl sm:left-0 sm:w-64 sm:translate-x-0">
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
                      {t("sessionScreenCaptureFps")} — {screenCaptureSettings.fps ?? 2}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={screenCaptureSettings.fps ?? 2}
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
        <div className="relative shrink-0" ref={connectionStatusRef}>
          <button
            type="button"
            onClick={() => {
              setShowConnectionStatusPanel((v) => !v);
              setShowNetworkStatusPanel(false);
            }}
            className="flex items-center justify-center rounded-lg p-1 text-gray-400 hover:bg-gray-700/50 transition touch-manipulation"
            aria-label={connectionStatusLabel}
            aria-expanded={showConnectionStatusPanel}
          >
            <Brain size={20} className={`sm:w-[18px] sm:h-[18px] ${connectionStatusColorClass}`} />
          </button>
          {showConnectionStatusPanel && (
            <div className="absolute bottom-full left-1/2 z-50 mb-5 w-40 -translate-x-1/2 rounded-xl border border-gray-700 bg-[#111827] p-3 shadow-xl">
              <div className="text-xs text-gray-500">{t("sessionStatusAi")}</div>
              <div className={`mt-1 text-sm font-medium ${connectionStatusColorClass}`}>
                {connectionStatusLabel}
              </div>
            </div>
          )}
        </div>
        <div className="relative shrink-0" ref={networkStatusRef}>
          <button
            type="button"
            onClick={() => {
              setShowNetworkStatusPanel((v) => !v);
              setShowConnectionStatusPanel(false);
            }}
            className="flex items-center justify-center rounded-lg p-1 text-gray-400 hover:bg-gray-700/50 transition touch-manipulation"
            aria-label={`${t("sessionStatusNetwork")}: ${networkLoadPercent}%`}
            aria-expanded={showNetworkStatusPanel}
          >
            <Wifi size={20} className={`sm:w-[18px] sm:h-[18px] ${networkStatusColorClass}`} />
          </button>
          {showNetworkStatusPanel && (
            <div className="absolute bottom-full left-1/2 z-50 mb-5 w-52 -translate-x-1/2 rounded-xl border border-gray-700 bg-[#111827] p-3 shadow-xl">
              <div className="text-xs text-gray-500">{t("sessionStatusNetwork")}</div>
              <div className={`mt-1 text-sm font-medium tabular-nums ${networkStatusColorClass}`}>
                {networkLoadPercent}%
              </div>
              <div className="text-[10px] text-gray-500">{t("sessionStatusNetworkActivity")}</div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className={`h-full rounded-full transition-[width] ${networkStatusFillClass}`}
                  style={{ width: `${networkLoadPercent}%` }}
                />
              </div>
              <div className="mt-2 space-y-1 text-xs tabular-nums text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">{t("sessionStatusNetworkOutgoing")}</span>
                  <span>{formatTrafficRate(networkTrafficStats.txBytesPerSecond)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">{t("sessionStatusNetworkIncoming")}</span>
                  <span>{formatTrafficRate(networkTrafficStats.rxBytesPerSecond)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">{t("sessionStatusNetworkTotal")}</span>
                  <span>{formatTrafficRate(networkTrafficStats.totalBytesPerSecond)}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] leading-4 text-gray-500">
                {t("sessionStatusNetworkHint")}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      <div
        className={`grid w-full shrink-0 order-last gap-1 ${
          showCameraTab ? "grid-cols-3" : "grid-cols-2"
        } sm:absolute sm:left-1/2 sm:flex sm:w-auto sm:-translate-x-1/2 sm:items-center sm:justify-center`}
      >
        <button
          type="button"
          onClick={onDialogTabToggle}
          className={`inline-flex min-w-0 items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition touch-manipulation sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
            dialogVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("sessionDialogTitle")}
        >
          <MessageSquare size={18} className="shrink-0 sm:w-4 sm:h-4" />
          <span className="truncate text-center">{t("sessionDialogTitle")}</span>
        </button>
        <button
          type="button"
          onClick={onMemoryTabToggle}
          className={`inline-flex min-w-0 items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition touch-manipulation sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
            memoryVisible
              ? "text-gray-200 bg-gray-700/70"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
          }`}
          title={t("memoryTitle")}
        >
          <BookOpen size={18} className="shrink-0 sm:w-4 sm:h-4" />
          <span className="truncate text-center">{t("memoryTitle")}</span>
        </button>
        {showCameraTab && (
          <button
            type="button"
            onClick={onCameraTabToggle}
            className={`inline-flex min-w-0 items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition touch-manipulation sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
              cameraVisible
                ? "text-gray-200 bg-gray-700/70"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/40"
            }`}
            title={t("sessionCameraViewTitle")}
          >
            <Video size={18} className="shrink-0 sm:w-4 sm:h-4" />
            <span className="truncate text-center sm:hidden">{t("sessionCameraViewShortTitle")}</span>
            <span className="hidden truncate text-center sm:inline">{t("sessionCameraViewTitle")}</span>
          </button>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1 justify-end">
        {version != null && version !== "" && (
          <span className="text-xs text-gray-500 tabular-nums shrink-0">v{version}</span>
        )}
      </div>
      {version != null && version !== "" && (
        <span className="absolute right-3 bottom-2 text-[10px] text-gray-500 tabular-nums shrink-0 sm:hidden" aria-hidden>
          v{version}
        </span>
      )}
    </div>
  );
};
