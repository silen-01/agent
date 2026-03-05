import type { ILiveSession } from "../api/index.ts";
import {
  SessionStatusBar,
  SessionAvatar,
  SessionDialogPanel,
  SessionMemoryPanel,
  SessionToolbar,
  DraggablePanel,
} from "./components";
import { language, constants, config, stripMemoryMarkersFromText } from "@modules";
import type { DialogMessage } from "../api/hooks/index.ts";
import type { ConnectionStatus } from "./components";
import { useAgentSession } from "./hooks";

export type AgentSessionPageProps = {
  /** Активная live-сессия с ИИ (для отправки аудио/видео и приёма ответов) */
  session: ILiveSession;
  /** Сессия открыта (onopen вызван), можно слать PCM */
  sessionReady?: boolean;
  /** Идёт подключение / переподключение */
  isConnecting?: boolean;
  isSpeaking?: boolean;
  /** Сохранённые сообщения диалога (до 20) */
  messages?: DialogMessage[];
  /** Текущий ввод пользователя (стриминг, «печатается») */
  inputTranscription?: string;
  /** Текущий ответ ИИ (стриминг, «печатается») */
  outputTranscription?: string;
  /** Громкость воспроизведения ответов ИИ (0–1) */
  setOutputVolume?: (volumeNormalized: number) => void;
  /** Нагрузка на сеть 0–100% (по объёму отправки/приёма за последнюю секунду) */
  networkLoadPercent?: number;
  memoryItems: string[];
  onClearMemory?: () => void;
  onRemoveMemoryItem?: (index: number) => void;
  /** Начальное состояние из вкладки «Управление» */
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  /** Возврат на первую страницу */
  onBack?: () => void;
  /** Ошибка доступа к микрофону (тост и т.п.) */
  onMicError?: (message: string) => void;
};

export const AgentSessionPage = ({
  session,
  sessionReady = false,
  isConnecting = false,
  isSpeaking = false,
  messages = [],
  inputTranscription = "",
  outputTranscription = "",
  setOutputVolume,
  networkLoadPercent = 0,
  memoryItems,
  onClearMemory,
  onRemoveMemoryItem,
  initialMicOn = true,
  initialScreenSharing = false,
  onBack,
  onMicError,
}: AgentSessionPageProps) => {
  const { t } = language.useLanguage();

  const connectionStatus: ConnectionStatus = isConnecting
    ? "reconnecting"
    : sessionReady
      ? "connected"
      : "disconnected";

  const sessionState = useAgentSession({
    session,
    sessionReady,
    initialMicOn,
    initialScreenSharing,
    onMicError,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <SessionAvatar isSpeaking={isSpeaking} />
      </div>

      {sessionState.dialogVisible && (
        <DraggablePanel
          title={t("sessionDialogTitle")}
          position={sessionState.dialogPosition}
          onPositionChange={sessionState.onDialogPositionChange}
          onClose={() => {
            sessionState.setDialogVisible(false);
            sessionState.setDialogCloseRequested(false);
          }}
          sizePx={sessionState.dialogSize}
          onResize={sessionState.onDialogResize}
          bottomSafeAreaPx={constants.session.bottomPanelOffsetPx}
          otherPanelBounds={sessionState.memoryVisible ? { x: sessionState.memoryPosition.x, y: sessionState.memoryPosition.y, width: sessionState.memorySize.width, height: sessionState.memorySize.height } : null}
          closeRequested={sessionState.dialogCloseRequested}
        >
          <SessionDialogPanel
            hideTitle
            messages={messages}
            streamingUser={inputTranscription}
            streamingModel={stripMemoryMarkersFromText(outputTranscription)}
            showListeningHint={sessionReady}
          />
        </DraggablePanel>
      )}
      {sessionState.memoryVisible && (
        <DraggablePanel
          title={t("memoryTitle")}
          position={sessionState.memoryPosition}
          onPositionChange={sessionState.onMemoryPositionChange}
          onClose={() => {
            sessionState.setMemoryVisible(false);
            sessionState.setMemoryCloseRequested(false);
          }}
          sizePx={sessionState.memorySize}
          onResize={sessionState.onMemoryResize}
          bottomSafeAreaPx={constants.session.bottomPanelOffsetPx}
          otherPanelBounds={sessionState.dialogVisible ? { x: sessionState.dialogPosition.x, y: sessionState.dialogPosition.y, width: sessionState.dialogSize.width, height: sessionState.dialogSize.height } : null}
          closeRequested={sessionState.memoryCloseRequested}
        >
          <SessionMemoryPanel
            items={memoryItems}
            onClear={onClearMemory}
            onRemoveItem={onRemoveMemoryItem}
            fillHeight
            hideTitle
          />
        </DraggablePanel>
      )}

      <SessionToolbar
        session={session}
        micOn={sessionState.micOn}
        micLevelPercent={sessionState.micLevelPercent}
        screenSharing={sessionState.screenSharing}
        cameraOn={sessionState.cameraOn}
        onMicToggle={() => sessionState.setMicOn((v) => !v)}
        onScreenShareToggle={() => sessionState.setScreenSharing((v) => !v)}
        onCameraToggle={() => sessionState.setCameraOn((v) => !v)}
        cameraDisabled={!constants.controls.cameraEnabled}
        onBack={onBack}
      />

      <div className="shrink-0 mt-1">
        <SessionStatusBar
          networkLoadPercent={networkLoadPercent}
          connectionStatus={connectionStatus}
          aiVolumePercent={sessionState.aiVolumePercent}
          onAiVolumeChange={(p) => {
            sessionState.setAiVolumePercent(p);
            setOutputVolume?.(p / 100);
          }}
          micSensitivity={sessionState.micSensitivity}
          onMicSensitivityChange={sessionState.setMicSensitivity}
          version={config.appVersion}
          dialogVisible={sessionState.dialogVisible}
          memoryVisible={sessionState.memoryVisible}
          onDialogTabToggle={sessionState.onDialogTabToggle}
          onMemoryTabToggle={sessionState.onMemoryTabToggle}
          screenCaptureSettings={sessionState.screenCaptureSettings}
          onScreenCaptureSettingsChange={(patch) =>
            sessionState.setScreenCaptureSettings((prev) => ({ ...prev, ...patch }))
          }
        />
      </div>
    </div>
  );
};
