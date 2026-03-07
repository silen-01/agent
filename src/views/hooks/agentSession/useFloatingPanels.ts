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

export function useFloatingPanels() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [dialogCloseRequested, setDialogCloseRequested] = useState(false);
  const [memoryCloseRequested, setMemoryCloseRequested] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number }>(getDefaultDialogPos);
  const [memoryPosition, setMemoryPosition] = useState<{ x: number; y: number }>(getDefaultMemoryPos);
  const [dialogSize, setDialogSize] = useState(() => ({ ...constants.session.defaultDialogSizePx }));
  const [memorySize, setMemorySize] = useState(() => ({ ...constants.session.defaultMemorySizePx }));

  const dialogVisibleRef = useRef(dialogVisible);
  const memoryVisibleRef = useRef(memoryVisible);
  useEffect(() => {
    dialogVisibleRef.current = dialogVisible;
    memoryVisibleRef.current = memoryVisible;
  }, [dialogVisible, memoryVisible]);

  const onDialogPositionChange = useCallback((pos: { x: number; y: number }) => setDialogPosition(pos), []);
  const onMemoryPositionChange = useCallback((pos: { x: number; y: number }) => setMemoryPosition(pos), []);
  const onDialogResize = useCallback((size: { width: number; height: number }) => setDialogSize(size), []);
  const onMemoryResize = useCallback((size: { width: number; height: number }) => setMemorySize(size), []);

  return {
    dialogVisible,
    memoryVisible,
    dialogCloseRequested,
    memoryCloseRequested,
    dialogPosition,
    memoryPosition,
    dialogSize,
    memorySize,
    setDialogVisible,
    setDialogCloseRequested,
    setMemoryVisible,
    setMemoryCloseRequested,
    onDialogPositionChange,
    onMemoryPositionChange,
    onDialogResize,
    onMemoryResize,
    onDialogTabToggle: useCallback(() => {
      if (dialogVisibleRef.current) setDialogCloseRequested(true);
      else setDialogVisible(true);
    }, []),
    onMemoryTabToggle: useCallback(() => {
      if (memoryVisibleRef.current) setMemoryCloseRequested(true);
      else setMemoryVisible(true);
    }, []),
  };
}
