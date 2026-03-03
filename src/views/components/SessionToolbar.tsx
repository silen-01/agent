import { Mic, MicOff, Monitor, MonitorOff, Video, VideoOff, LogOut } from "lucide-react";
import type { ILiveSession } from "../../api/index.ts";
import { language } from "@modules";

export type SessionToolbarProps = {
  /** Live-сессия с ИИ (для будущей отправки аудио/видео через sendRealtimeInput) */
  session: ILiveSession;
  micOn: boolean;
  /** 0–100, уровень микрофона для заливки иконки снизу вверх (только при micOn) */
  micLevelPercent?: number;
  screenSharing: boolean;
  cameraOn: boolean;
  onMicToggle: () => void;
  onScreenShareToggle: () => void;
  onCameraToggle: () => void;
  /** Камера пока не используется — кнопка disabled */
  cameraDisabled?: boolean;
  /** Возврат на первую страницу */
  onBack?: () => void;
};

export const SessionToolbar = ({
  session: _session,
  micOn,
  micLevelPercent = 0,
  screenSharing,
  cameraOn,
  onMicToggle,
  onScreenShareToggle,
  onCameraToggle,
  cameraDisabled = true,
  onBack,
}: SessionToolbarProps) => {
  const { t } = language.useLanguage();
  const level = Math.min(100, Math.max(0, micLevelPercent));

  return (
    <div className="shrink-0 flex items-center justify-center gap-3 py-3">
      <button
        type="button"
        onClick={onMicToggle}
        className={`flex items-center justify-center p-3 rounded-xl border transition-colors size-[46px] ${
          micOn
            ? "border-gray-600 bg-gray-700/50 hover:bg-gray-700 text-white"
            : "border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
        }`}
        title={micOn ? t("sessionToolbarMute") : t("sessionToolbarUnmute")}
      >
        {micOn ? (
          <span className="relative block w-[22px] h-[22px] shrink-0 overflow-hidden">
            {/* Нижняя часть иконки — зелёная (уровень) */}
            <span
              className="absolute inset-0 transition-[clip-path] duration-150"
              style={{ clipPath: `inset(${100 - level}% 0 0 0)` }}
            >
              <Mic size={22} className="text-green-500 block" />
            </span>
            {/* Верхняя часть иконки — белая */}
            <span
              className="absolute inset-0 transition-[clip-path] duration-150"
              style={{ clipPath: `inset(0 0 ${level}% 0)` }}
            >
              <Mic size={22} className="text-white block" />
            </span>
          </span>
        ) : (
          <MicOff size={22} />
        )}
      </button>
      <button
        type="button"
        onClick={onScreenShareToggle}
        className={`flex items-center justify-center p-3 rounded-xl border transition-colors size-[46px] ${
          screenSharing
            ? "border-gray-600 bg-gray-700/50 hover:bg-gray-700 text-white"
            : "border-blue-500/50 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        }`}
        title={screenSharing ? t("sessionToolbarStopShare") : t("sessionToolbarShareScreen")}
      >
        {screenSharing ? <Monitor size={22} /> : <MonitorOff size={22} />}
      </button>
      <button
        type="button"
        onClick={onCameraToggle}
        disabled={cameraDisabled}
        className={`flex items-center justify-center p-3 rounded-xl border transition-colors size-[46px] ${
          cameraDisabled
            ? "border-gray-700 bg-gray-800/50 text-gray-600 cursor-not-allowed"
            : cameraOn
              ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
              : "border-gray-600 bg-gray-700/50 hover:bg-gray-700 text-white"
        }`}
        title={cameraDisabled ? t("sessionToolbarCameraOff") : t("sessionToolbarCamera")}
      >
        {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
      </button>
      {onBack != null && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center p-3 rounded-xl border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors size-[46px]"
          title={t("sessionToolbarBack")}
        >
          <LogOut size={22} />
        </button>
      )}
    </div>
  );
};
