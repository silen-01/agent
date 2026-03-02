import { useState, useCallback } from "react";
import {
  SessionStatusBar,
  SessionAvatar,
  SessionDialogPanel,
  SessionMemoryPanel,
  SessionToolbar,
  DraggablePanel,
} from "./components";
import { language, config } from "@modules";

export type AgentSessionPageProps = {
  memoryItems: string[];
  onClearMemory?: () => void;
  onRemoveMemoryItem?: (index: number) => void;
  /** Начальное состояние из вкладки «Управление» */
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  /** Возврат на первую страницу */
  onBack?: () => void;
};

/** Высота нижней панели (тулбар + статус-бар + отступы), чтобы окна были над нею */
const BOTTOM_PANEL_OFFSET_PX = 120;

function getDefaultDialogPos() {
  if (typeof window === "undefined") return { x: 24, y: 200 };
  return {
    x: 24,
    y: window.innerHeight - 18 * 16 - BOTTOM_PANEL_OFFSET_PX, // слева снизу, над панелью
  };
}
function getDefaultMemoryPos() {
  if (typeof window === "undefined") return { x: 400, y: 200 };
  return {
    x: window.innerWidth - 20 * 16 - 24,
    y: window.innerHeight - 16 * 16 - BOTTOM_PANEL_OFFSET_PX, // справа снизу, над панелью
  };
}

export const AgentSessionPage = ({
  memoryItems,
  onClearMemory,
  onRemoveMemoryItem,
  initialMicOn = true,
  initialScreenSharing = false,
  onBack,
}: AgentSessionPageProps) => {
  const [micOn, setMicOn] = useState(initialMicOn);
  const [screenSharing, setScreenSharing] = useState(initialScreenSharing);
  const [cameraOn, setCameraOn] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [dialogCloseRequested, setDialogCloseRequested] = useState(false);
  const [memoryCloseRequested, setMemoryCloseRequested] = useState(false);
  const [dialogPosition, setDialogPosition] = useState(getDefaultDialogPos);
  const [memoryPosition, setMemoryPosition] = useState(getDefaultMemoryPos);
  const [dialogSize, setDialogSize] = useState({ width: 22 * 16, height: 18 * 16 });
  const [memorySize, setMemorySize] = useState({ width: 20 * 16, height: 16 * 16 });
  const { t } = language.useLanguage();
  const [aiVolumePercent, setAiVolumePercent] = useState(80);
  const micLevelPercent = 70;
  const isSpeaking = false;

  const onDialogPositionChange = useCallback((pos: { x: number; y: number }) => setDialogPosition(pos), []);
  const onMemoryPositionChange = useCallback((pos: { x: number; y: number }) => setMemoryPosition(pos), []);
  const onDialogResize = useCallback((size: { width: number; height: number }) => setDialogSize(size), []);
  const onMemoryResize = useCallback((size: { width: number; height: number }) => setMemorySize(size), []);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <SessionAvatar isSpeaking={isSpeaking} />
      </div>

      {dialogVisible && (
        <DraggablePanel
          title={t("sessionDialogTitle")}
          position={dialogPosition}
          onPositionChange={onDialogPositionChange}
          onClose={() => {
            setDialogVisible(false);
            setDialogCloseRequested(false);
          }}
          sizePx={dialogSize}
          onResize={onDialogResize}
          bottomSafeAreaPx={BOTTOM_PANEL_OFFSET_PX}
          otherPanelBounds={memoryVisible ? { x: memoryPosition.x, y: memoryPosition.y, width: memorySize.width, height: memorySize.height } : null}
          closeRequested={dialogCloseRequested}
        >
          <SessionDialogPanel hideTitle />
        </DraggablePanel>
      )}
      {memoryVisible && (
        <DraggablePanel
          title={t("memoryTitle")}
          position={memoryPosition}
          onPositionChange={onMemoryPositionChange}
          onClose={() => {
            setMemoryVisible(false);
            setMemoryCloseRequested(false);
          }}
          sizePx={memorySize}
          onResize={onMemoryResize}
          bottomSafeAreaPx={BOTTOM_PANEL_OFFSET_PX}
          otherPanelBounds={dialogVisible ? { x: dialogPosition.x, y: dialogPosition.y, width: dialogSize.width, height: dialogSize.height } : null}
          closeRequested={memoryCloseRequested}
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
        micOn={micOn}
        micLevelPercent={micLevelPercent}
        screenSharing={screenSharing}
        cameraOn={cameraOn}
        onMicToggle={() => setMicOn((v) => !v)}
        onScreenShareToggle={() => setScreenSharing((v) => !v)}
        onCameraToggle={() => setCameraOn((v) => !v)}
        cameraDisabled={!config.controls.cameraEnabled}
        onBack={onBack}
      />

      <div className="shrink-0 mt-1">
        <SessionStatusBar
          networkLoadPercent={0}
          aiStatus="ready"
          aiVolumePercent={aiVolumePercent}
          onAiVolumeChange={setAiVolumePercent}
          version={config.appVersion}
          dialogVisible={dialogVisible}
          memoryVisible={memoryVisible}
          onDialogTabToggle={() => {
            if (dialogVisible) setDialogCloseRequested(true);
            else setDialogVisible(true);
          }}
          onMemoryTabToggle={() => {
            if (memoryVisible) setMemoryCloseRequested(true);
            else setMemoryVisible(true);
          }}
        />
      </div>
    </div>
  );
};
