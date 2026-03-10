import { useState, useCallback, useRef, useEffect } from "react";
import { constants } from "@modules";

function getDefaultDialogPos() {
  const { bottomPanelOffsetPx, panelMarginPx, defaultDialogSizePx } = constants.session;
  if (typeof window === "undefined") return { x: panelMarginPx, y: 200 };
  return {
    x: panelMarginPx,
    y: window.innerHeight - defaultDialogSizePx.height - bottomPanelOffsetPx,
  };
}

function getDefaultMemoryPos() {
  const { bottomPanelOffsetPx, panelMarginPx, defaultMemorySizePx } = constants.session;
  if (typeof window === "undefined") return { x: 400, y: 200 };
  return {
    x: window.innerWidth - defaultMemorySizePx.width - panelMarginPx,
    y: window.innerHeight - defaultMemorySizePx.height - bottomPanelOffsetPx,
  };
}

function getDefaultCameraPos() {
  const { bottomPanelOffsetPx, panelMarginPx, defaultCameraSizePx } = constants.session;
  if (typeof window === "undefined") return { x: 200, y: 200 };
  return {
    x: Math.max(panelMarginPx, (window.innerWidth - defaultCameraSizePx.width) / 2),
    y: window.innerHeight - defaultCameraSizePx.height - bottomPanelOffsetPx,
  };
}

export function useFloatingPanels() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [dialogCloseRequested, setDialogCloseRequested] = useState(false);
  const [memoryCloseRequested, setMemoryCloseRequested] = useState(false);
  const [cameraCloseRequested, setCameraCloseRequested] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number }>(getDefaultDialogPos);
  const [memoryPosition, setMemoryPosition] = useState<{ x: number; y: number }>(getDefaultMemoryPos);
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number }>(getDefaultCameraPos);
  const [dialogSize, setDialogSize] = useState(() => ({ ...constants.session.defaultDialogSizePx }));
  const [memorySize, setMemorySize] = useState(() => ({ ...constants.session.defaultMemorySizePx }));
  const [cameraSize, setCameraSize] = useState<{ width: number; height: number }>(() => ({
    ...constants.session.defaultCameraSizePx,
  }));

  const dialogVisibleRef = useRef(dialogVisible);
  const memoryVisibleRef = useRef(memoryVisible);
  const cameraVisibleRef = useRef(cameraVisible);
  useEffect(() => {
    dialogVisibleRef.current = dialogVisible;
    memoryVisibleRef.current = memoryVisible;
    cameraVisibleRef.current = cameraVisible;
  }, [dialogVisible, memoryVisible, cameraVisible]);

  const onDialogPositionChange = useCallback((pos: { x: number; y: number }) => setDialogPosition(pos), []);
  const onMemoryPositionChange = useCallback((pos: { x: number; y: number }) => setMemoryPosition(pos), []);
  const onCameraPositionChange = useCallback((pos: { x: number; y: number }) => setCameraPosition(pos), []);
  const onDialogResize = useCallback((size: { width: number; height: number }) => setDialogSize(size), []);
  const onMemoryResize = useCallback((size: { width: number; height: number }) => setMemorySize(size), []);
  const onCameraResize = useCallback((size: { width: number; height: number }) => setCameraSize(size), []);

  return {
    dialogVisible,
    memoryVisible,
    cameraVisible,
    dialogCloseRequested,
    memoryCloseRequested,
    cameraCloseRequested,
    dialogPosition,
    memoryPosition,
    cameraPosition,
    dialogSize,
    memorySize,
    cameraSize,
    setDialogVisible,
    setDialogCloseRequested,
    setMemoryVisible,
    setMemoryCloseRequested,
    setCameraVisible,
    setCameraCloseRequested,
    onDialogPositionChange,
    onMemoryPositionChange,
    onCameraPositionChange,
    onDialogResize,
    onMemoryResize,
    onCameraResize,
    onDialogTabToggle: useCallback(() => {
      if (dialogVisibleRef.current) setDialogCloseRequested(true);
      else setDialogVisible(true);
    }, []),
    onMemoryTabToggle: useCallback(() => {
      if (memoryVisibleRef.current) setMemoryCloseRequested(true);
      else setMemoryVisible(true);
    }, []),
    onCameraTabToggle: useCallback(() => {
      if (cameraVisibleRef.current) setCameraCloseRequested(true);
      else setCameraVisible(true);
    }, []),
  };
}
