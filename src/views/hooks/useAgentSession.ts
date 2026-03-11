import { useState } from "react";
import type { ILiveSession } from "../../api/index.ts";
import { constants } from "@modules";
import { useMicCapture } from "./agentSession/useMicCapture.ts";
import { useScreenCapture } from "./agentSession/useScreenCapture.ts";
import { useCameraCapture } from "./agentSession/useCameraCapture.ts";
import type { CameraCaptureSettings } from "./agentSession/useCameraCapture.ts";
import { useFloatingPanels } from "./agentSession/useFloatingPanels.ts";

export type { ScreenCaptureSettings } from "./agentSession/useScreenCapture.ts";
export type { CameraCaptureSettings } from "./agentSession/useCameraCapture.ts";

export type UseAgentSessionParams = {
  session: ILiveSession;
  sessionReady: boolean;
  initialMicOn?: boolean;
  initialScreenSharing?: boolean;
  initialCameraOn?: boolean;
  onMicError?: (message: string) => void;
};

export function useAgentSession({
  session,
  sessionReady = false,
  initialMicOn = true,
  initialScreenSharing = false,
  initialCameraOn = false,
  onMicError,
}: UseAgentSessionParams) {
  const [micOn, setMicOn] = useState(initialMicOn);
  const [cameraOn, setCameraOn] = useState(initialCameraOn);
  const [cameraCaptureSettings, setCameraCaptureSettings] = useState<CameraCaptureSettings>(
    () => ({ ...constants.session.cameraCapture })
  );
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

  const { cameraStream } = useCameraCapture({
    session,
    sessionReady,
    cameraOn,
    setCameraOn,
    cameraCaptureSettings,
    onError: onMicError,
  });

  const panels = useFloatingPanels();

  return {
    micOn,
    setMicOn,
    micLevelPercent: mic.micLevelPercent,
    screenShareAvailable: screen.screenShareAvailable,
    screenSharing: screen.screenSharing,
    setScreenSharing: screen.setScreenSharing,
    screenStream: screen.screenStream,
    cameraOn,
    setCameraOn,
    cameraStream,
    dialogVisible: panels.dialogVisible,
    memoryVisible: panels.memoryVisible,
    cameraVisible: panels.cameraVisible,
    dialogCloseRequested: panels.dialogCloseRequested,
    memoryCloseRequested: panels.memoryCloseRequested,
    cameraCloseRequested: panels.cameraCloseRequested,
    dialogPosition: panels.dialogPosition,
    memoryPosition: panels.memoryPosition,
    cameraPosition: panels.cameraPosition,
    dialogSize: panels.dialogSize,
    memorySize: panels.memorySize,
    cameraSize: panels.cameraSize,
    aiVolumePercent,
    setAiVolumePercent,
    micSensitivity,
    setMicSensitivity,
    screenCaptureSettings: screen.screenCaptureSettings,
    setScreenCaptureSettings: screen.setScreenCaptureSettings,
    cameraCaptureSettings,
    setCameraCaptureSettings,
    onDialogPositionChange: panels.onDialogPositionChange,
    onMemoryPositionChange: panels.onMemoryPositionChange,
    onCameraPositionChange: panels.onCameraPositionChange,
    onDialogResize: panels.onDialogResize,
    onMemoryResize: panels.onMemoryResize,
    onCameraResize: panels.onCameraResize,
    setDialogVisible: panels.setDialogVisible,
    setDialogCloseRequested: panels.setDialogCloseRequested,
    setMemoryVisible: panels.setMemoryVisible,
    setMemoryCloseRequested: panels.setMemoryCloseRequested,
    setCameraVisible: panels.setCameraVisible,
    setCameraCloseRequested: panels.setCameraCloseRequested,
    onDialogTabToggle: panels.onDialogTabToggle,
    onMemoryTabToggle: panels.onMemoryTabToggle,
    onCameraTabToggle: panels.onCameraTabToggle,
  };
}
