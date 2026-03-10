import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { ILiveSession } from "../api/index.ts";
import {
  SessionStatusBar,
  SessionAvatar,
  SessionDialogPanel,
  SessionMemoryPanel,
  SessionToolbar,
  DraggablePanel,
} from "./components";
import {
  language,
  constants,
  config,
  stripMemoryMarkersFromText,
  buildSystemInstruction,
  getMemoryItemCanonical,
  isMemoryItemDuplicate,
} from "@modules";
import { memoryStorage, settingsStorage } from "@storages";
import { useLiveSession } from "../api/hooks/index.ts";
import type { DialogMessage } from "../api/hooks/index.ts";
import type { ConnectionStatus } from "./components";
import { useAgentSession, useToast } from "./hooks";

export type AgentSessionPageProps = {
  /** В режиме route (нет session) — читаем settings/memory из storage, строим systemInstruction сами */
  session?: ILiveSession | null;
  sessionReady?: boolean;
  isConnecting?: boolean;
  isSpeaking?: boolean;
  messages?: DialogMessage[];
  inputTranscription?: string;
  outputTranscription?: string;
  setOutputVolume?: (volumeNormalized: number) => void;
  networkLoadPercent?: number;
  memoryItems?: string[];
  onClearMemory?: () => void;
  onRemoveMemoryItem?: (index: number) => void;
  onMemoryItemExtracted?: (item: string) => void;
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  initialCameraOn?: boolean;
  onBack?: () => void;
  onMicError?: (message: string) => void;
};

export const AgentSessionPage = ({
  session: sessionProp,
  sessionReady: sessionReadyProp = false,
  isConnecting: isConnectingProp = false,
  isSpeaking: isSpeakingProp = false,
  messages: messagesProp = [],
  inputTranscription: inputTranscriptionProp = "",
  outputTranscription: outputTranscriptionProp = "",
  setOutputVolume: setOutputVolumeProp,
  networkLoadPercent: networkLoadPercentProp = 0,
  memoryItems: memoryItemsProp,
  onClearMemory: onClearMemoryProp,
  onRemoveMemoryItem: onRemoveMemoryItemProp,
  onMemoryItemExtracted: onMemoryItemExtractedProp,
  initialMicOn: initialMicOnProp = true,
  initialScreenSharing: initialScreenSharingProp = false,
  initialCameraOn: initialCameraOnProp = false,
  onBack: onBackProp,
  onMicError,
}: AgentSessionPageProps) => {
  const { t, lang } = language.useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isRouteMode = location.pathname === "/session" && sessionProp === undefined;

  const [routeMemoryItems, setRouteMemoryItems] = useState<string[]>(() =>
    isRouteMode ? memoryStorage.loadMemoryItems() : []
  );

  /** Геттер актуального промпта для реконнекта (память и настройки на текущий момент). */
  const getSystemInstructionRef = useRef<() => string>(() => "");

  const { showToast } = useToast();
  const handleRouteMemoryExtracted = useCallback(
    (item: string) => {
      const canonical = getMemoryItemCanonical(item);
      if (!canonical) return;
      setRouteMemoryItems((prev) => {
        if (isMemoryItemDuplicate(canonical, prev)) return prev;
        const next = [...prev, canonical];
        memoryStorage.saveMemoryItems(next);
        showToast(t("memoryItemSaved"));
        return next;
      });
    },
    [showToast, t]
  );

  const liveHook = useLiveSession({
    onMemoryItemExtracted: isRouteMode ? handleRouteMemoryExtracted : (onMemoryItemExtractedProp ?? (() => {})),
  });
  const {
    session: liveSession,
    sessionReady: liveSessionReady,
    isSpeaking: liveIsSpeaking,
    messages: liveMessages,
    inputTranscription: liveInputTranscription,
    outputTranscription: liveOutputTranscription,
    isConnecting: liveIsConnecting,
    connectionError: liveConnectionError,
    setOutputVolume: liveSetOutputVolume,
    networkLoadPercent: liveNetworkLoadPercent,
    launch,
    disconnect,
  } = liveHook;

  const launchStartedRef = useRef(false);
  const [routeSettings, setRouteSettings] = useState<ReturnType<typeof settingsStorage.loadSettings> | null>(null);

  useEffect(() => {
    if (!isRouteMode) return;
    getSystemInstructionRef.current = () =>
      buildSystemInstruction(
        routeSettings ?? settingsStorage.loadSettings(),
        routeMemoryItems,
        t,
        lang,
        constants.personalities,
        constants.language.defaultLang
      );
  }, [isRouteMode, routeSettings, routeMemoryItems, t, lang]);

  useEffect(() => {
    if (!isRouteMode) return;
    if (launchStartedRef.current) return;
    launchStartedRef.current = true;
    const settings = settingsStorage.loadSettings();
    const memoryItemsFromStorage = memoryStorage.loadMemoryItems();
    const timer = setTimeout(() => {
      setRouteSettings(settings);
      setRouteMemoryItems(memoryItemsFromStorage);
    }, 0);
    getSystemInstructionRef.current = () =>
      buildSystemInstruction(
        settings,
        memoryItemsFromStorage,
        t,
        lang,
        constants.personalities,
        constants.language.defaultLang
      );
    launch(
      getSystemInstructionRef,
      t,
      showToast,
      settings.voiceId,
      settings.reactionTimeoutSeconds,
      t("systemInstructionAutoReaction")
    ).catch(() => {});
    return () => clearTimeout(timer);
  }, [isRouteMode, launch, t, lang, showToast]);

  const session = sessionProp ?? liveSession;
  const sessionReady = sessionProp !== undefined ? sessionReadyProp : liveSessionReady;
  const isConnecting = sessionProp !== undefined ? isConnectingProp : liveIsConnecting;
  const isSpeaking = sessionProp !== undefined ? isSpeakingProp : liveIsSpeaking;
  const messages = sessionProp !== undefined ? messagesProp : liveMessages;
  const inputTranscription = sessionProp !== undefined ? inputTranscriptionProp : liveInputTranscription;
  const outputTranscription = sessionProp !== undefined ? outputTranscriptionProp : liveOutputTranscription;
  const setOutputVolume = sessionProp !== undefined ? setOutputVolumeProp : liveSetOutputVolume;
  const networkLoadPercent = sessionProp !== undefined ? networkLoadPercentProp : liveNetworkLoadPercent;
  const s = routeSettings;
  const initialMicOn = sessionProp !== undefined ? initialMicOnProp : (s?.microphone ?? true);
  const initialScreenSharing = sessionProp !== undefined ? initialScreenSharingProp : (s?.screenShare ?? false);
  const initialCameraOn = sessionProp !== undefined ? initialCameraOnProp : (s?.camera ?? false);
  const handleBack = sessionProp !== undefined ? (onBackProp ?? (() => {})) : () => { disconnect(); navigate("/"); };
  const effectiveOnMicError = sessionProp !== undefined ? onMicError : showToast;

  const memoryItems = sessionProp !== undefined ? (memoryItemsProp ?? []) : routeMemoryItems;
  const handleClearMemory = sessionProp !== undefined
    ? (onClearMemoryProp ?? (() => {}))
    : () => {
        setRouteMemoryItems([]);
        memoryStorage.saveMemoryItems([]);
        showToast(t("memoryCleared"));
        if (liveSession) {
          try {
            liveSession.sendRealtimeInput({ text: t("memoryNotifyModelCleared") });
          } catch {
            /* ignore */
          }
        }
      };
  const handleRemoveMemoryItem = sessionProp !== undefined
    ? (onRemoveMemoryItemProp ?? (() => {}))
    : (index: number) => {
        const removedItem = routeMemoryItems[index];
        setRouteMemoryItems((prev) => {
          const next = prev.filter((_, i) => i !== index);
          memoryStorage.saveMemoryItems(next);
          return next;
        });
        if (liveSession && removedItem != null) {
          try {
            liveSession.sendRealtimeInput({
              text: t("memoryNotifyModelRemoved").replace("{item}", removedItem),
            });
          } catch {
            /* ignore */
          }
        }
      };

  const micPermissionRequestedRef = useRef(false);
  useEffect(() => {
    if (!isRouteMode || session != null || micPermissionRequestedRef.current) return;
    micPermissionRequestedRef.current = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch(() => {});
  }, [isRouteMode, session]);

  if (isRouteMode && !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <p className="text-gray-400">{t("launchConnecting")}</p>
        {liveConnectionError && (
          <p className="text-sm text-red-400 mt-2 text-center" role="alert">
            {liveConnectionError}
          </p>
        )}
      </div>
    );
  }

  if (!session) return null;

  return (
    <AgentSessionContent
      session={session}
      sessionReady={sessionReady}
      isConnecting={isConnecting}
      isSpeaking={isSpeaking}
      messages={messages}
      inputTranscription={inputTranscription}
      outputTranscription={outputTranscription}
      setOutputVolume={setOutputVolume}
      networkLoadPercent={networkLoadPercent}
      memoryItems={memoryItems}
      onClearMemory={handleClearMemory}
      onRemoveMemoryItem={handleRemoveMemoryItem}
      initialMicOn={initialMicOn}
      initialScreenSharing={initialScreenSharing}
      initialCameraOn={initialCameraOn}
      handleBack={handleBack}
      effectiveOnMicError={effectiveOnMicError}
      isRouteMode={isRouteMode}
      onUnlockOutputAudio={() => liveHook.unlockOutputAudio()}
    />
  );
};

type PreviewSource = "camera" | "screen";

/** Панель превью: переключение между камерой и трансляцией экрана, отображение выбранного потока. */
function CameraPreviewPanel({
  cameraStream,
  screenStream,
  cameraOn,
  screenSharing,
  loadingLabel,
  cameraLabel,
  screenLabel,
  videoLabel,
}: {
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  cameraOn: boolean;
  screenSharing: boolean;
  loadingLabel: string;
  cameraLabel: string;
  screenLabel: string;
  videoLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCamera = cameraOn && cameraStream != null;
  const hasScreen = screenSharing && screenStream != null;
  const [viewSource, setViewSource] = useState<PreviewSource>(() =>
    cameraOn ? "camera" : screenSharing ? "screen" : "camera"
  );
  const currentStream = viewSource === "camera" ? cameraStream : screenStream;

  useEffect(() => {
    if (viewSource === "screen" && !hasScreen && hasCamera) setViewSource("camera");
    if (viewSource === "camera" && !hasCamera && hasScreen) setViewSource("screen");
  }, [viewSource, hasCamera, hasScreen]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = currentStream;
    return () => {
      v.srcObject = null;
    };
  }, [currentStream]);

  const showTabs = hasCamera || hasScreen;

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-black rounded overflow-hidden">
      {showTabs && (
        <div className="shrink-0 flex border-b border-gray-700">
          <button
            type="button"
            onClick={() => setViewSource("camera")}
            disabled={!hasCamera}
            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
              viewSource === "camera"
                ? "text-white bg-gray-700"
                : hasCamera
                  ? "text-gray-300 hover:bg-gray-700/50"
                  : "text-gray-500 cursor-not-allowed"
            }`}
          >
            {cameraLabel}
          </button>
          <button
            type="button"
            onClick={() => setViewSource("screen")}
            disabled={!hasScreen}
            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
              viewSource === "screen"
                ? "text-white bg-gray-700"
                : hasScreen
                  ? "text-gray-300 hover:bg-gray-700/50"
                  : "text-gray-500 cursor-not-allowed"
            }`}
          >
            {screenLabel}
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col">
        {currentStream != null ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
            aria-label={videoLabel}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">{loadingLabel}</div>
        )}
      </div>
    </div>
  );
}

/** Внутренний компонент: рендерится только при наличии session, всегда вызывает useAgentSession (правила хуков). */
type AgentSessionContentProps = {
  session: ILiveSession;
  sessionReady: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  messages: DialogMessage[];
  inputTranscription: string;
  outputTranscription: string;
  setOutputVolume?: (volumeNormalized: number) => void;
  networkLoadPercent: number;
  memoryItems: string[];
  onClearMemory?: () => void;
  onRemoveMemoryItem?: (index: number) => void;
  initialMicOn: boolean;
  initialScreenSharing: boolean;
  initialCameraOn: boolean;
  handleBack: () => void;
  effectiveOnMicError?: (message: string) => void;
  isRouteMode: boolean;
  onUnlockOutputAudio?: () => void;
};

const AgentSessionContent = ({
  session,
  sessionReady,
  isConnecting,
  isSpeaking,
  messages,
  inputTranscription,
  outputTranscription,
  setOutputVolume,
  networkLoadPercent,
  memoryItems,
  onClearMemory,
  onRemoveMemoryItem,
  initialMicOn,
  initialScreenSharing,
  initialCameraOn,
  handleBack,
  effectiveOnMicError,
  isRouteMode,
  onUnlockOutputAudio,
}: AgentSessionContentProps) => {
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
    initialCameraOn,
    onMicError: effectiveOnMicError ?? (() => {}),
  });

  useEffect(() => {
    if (!sessionState.cameraOn && !sessionState.screenSharing) sessionState.setCameraVisible(false);
  }, [sessionState.cameraOn, sessionState.screenSharing, sessionState.setCameraVisible]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative ${isRouteMode ? "session-page-in" : ""}`}>
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
      {(sessionState.cameraOn || sessionState.screenSharing) && sessionState.cameraVisible && (
        <DraggablePanel
          title={t("sessionCameraViewTitle")}
          position={sessionState.cameraPosition}
          onPositionChange={sessionState.onCameraPositionChange}
          onClose={() => {
            sessionState.setCameraVisible(false);
            sessionState.setCameraCloseRequested(false);
          }}
          sizePx={sessionState.cameraSize}
          onResize={sessionState.onCameraResize}
          bottomSafeAreaPx={constants.session.bottomPanelOffsetPx}
          otherPanelBounds={sessionState.dialogVisible ? { x: sessionState.dialogPosition.x, y: sessionState.dialogPosition.y, width: sessionState.dialogSize.width, height: sessionState.dialogSize.height } : sessionState.memoryVisible ? { x: sessionState.memoryPosition.x, y: sessionState.memoryPosition.y, width: sessionState.memorySize.width, height: sessionState.memorySize.height } : null}
          closeRequested={sessionState.cameraCloseRequested}
        >
          <CameraPreviewPanel
            cameraStream={sessionState.cameraStream}
            screenStream={sessionState.screenStream}
            cameraOn={sessionState.cameraOn}
            screenSharing={sessionState.screenSharing}
            loadingLabel={t("launchConnecting")}
            cameraLabel={t("camera")}
            screenLabel={t("screenShare")}
            videoLabel={t("sessionCameraViewTitle")}
          />
        </DraggablePanel>
      )}

      <SessionToolbar
        micOn={sessionState.micOn}
        micLevelPercent={sessionState.micLevelPercent}
        screenSharing={sessionState.screenSharing}
        cameraOn={sessionState.cameraOn}
        onMicToggle={() => {
          if (!sessionState.micOn) onUnlockOutputAudio?.();
          sessionState.setMicOn((v) => !v);
        }}
        onScreenShareToggle={() => sessionState.setScreenSharing((v) => !v)}
        onCameraToggle={() => sessionState.setCameraOn((v) => !v)}
        cameraDisabled={!constants.controls.cameraEnabled}
        onBack={handleBack}
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
          showPreviewTab={sessionState.cameraOn || sessionState.screenSharing}
          cameraVisible={sessionState.cameraVisible}
          onDialogTabToggle={sessionState.onDialogTabToggle}
          onMemoryTabToggle={sessionState.onMemoryTabToggle}
          onCameraTabToggle={sessionState.onCameraTabToggle}
          screenCaptureSettings={sessionState.screenCaptureSettings}
          onScreenCaptureSettingsChange={(patch) =>
            sessionState.setScreenCaptureSettings((prev) => ({ ...prev, ...patch }))
          }
          cameraCaptureSettings={sessionState.cameraCaptureSettings}
          onCameraCaptureSettingsChange={(patch) =>
            sessionState.setCameraCaptureSettings((prev) => ({ ...prev, ...patch }))
          }
        />
      </div>
    </div>
  );
};
