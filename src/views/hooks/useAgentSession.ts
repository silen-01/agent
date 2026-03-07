import { useState } from "react";
import type { ILiveSession } from "../../api/index.ts";
import { useMicCapture } from "./agentSession/useMicCapture.ts";
import { useScreenCapture } from "./agentSession/useScreenCapture.ts";
import { useFloatingPanels } from "./agentSession/useFloatingPanels.ts";

export type { ScreenCaptureSettings } from "./agentSession/useScreenCapture.ts";

export type UseAgentSessionParams = {
  session: ILiveSession;
  sessionReady: boolean;
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  onMicError?: (message: string) => void;
};

export function useAgentSession({
  session,
  sessionReady = false,
  initialMicOn = true,
  initialScreenSharing = false,
  onMicError,
}: UseAgentSessionParams) {
  const [micOn, setMicOn] = useState(initialMicOn);
  const [cameraOn, setCameraOn] = useState(false);
  const [aiVolumePercent, setAiVolumePercent] = useState(80);
  const [micSensitivity, setMicSensitivity] = useState(1);

  const mic = useMicCapture({
    session,
    sessionReady,
    micOn,
    micSensitivity,
    onMicError,
  });

  const screen = useScreenCapture({
    session,
    sessionReady,
    initialScreenSharing,
    onError: onMicError,
  });

  const panels = useFloatingPanels();

  return {
    micOn,
    setMicOn,
    micLevelPercent: mic.micLevelPercent,
    screenSharing: screen.screenSharing,
    setScreenSharing: screen.setScreenSharing,
    cameraOn,
    setCameraOn,
    dialogVisible: panels.dialogVisible,
    memoryVisible: panels.memoryVisible,
    dialogCloseRequested: panels.dialogCloseRequested,
    memoryCloseRequested: panels.memoryCloseRequested,
    dialogPosition: panels.dialogPosition,
    memoryPosition: panels.memoryPosition,
    dialogSize: panels.dialogSize,
    memorySize: panels.memorySize,
    aiVolumePercent,
    setAiVolumePercent,
    micSensitivity,
    setMicSensitivity,
    screenCaptureSettings: screen.screenCaptureSettings,
    setScreenCaptureSettings: screen.setScreenCaptureSettings,
    onDialogPositionChange: panels.onDialogPositionChange,
    onMemoryPositionChange: panels.onMemoryPositionChange,
    onDialogResize: panels.onDialogResize,
    onMemoryResize: panels.onMemoryResize,
    setDialogVisible: panels.setDialogVisible,
    setDialogCloseRequested: panels.setDialogCloseRequested,
    setMemoryVisible: panels.setMemoryVisible,
    setMemoryCloseRequested: panels.setMemoryCloseRequested,
    onDialogTabToggle: panels.onDialogTabToggle,
    onMemoryTabToggle: panels.onMemoryTabToggle,
  };
}
