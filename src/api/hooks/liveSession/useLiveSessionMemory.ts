import { useRef, useEffect } from "react";
import { extractMemoryItemsFromText, getMemoryItemDedupKey } from "@modules";

export function useLiveSessionMemory(onMemoryItemExtracted?: (item: string) => void) {
  const onMemoryItemExtractedRef = useRef(onMemoryItemExtracted);
  useEffect(() => {
    onMemoryItemExtractedRef.current = onMemoryItemExtracted;
  }, [onMemoryItemExtracted]);

  const currentTurnOutputRef = useRef("");
  const extractedThisTurnRef = useRef<Set<string>>(new Set());

  const resetTurn = () => {
    currentTurnOutputRef.current = "";
    extractedThisTurnRef.current = new Set();
  };

  const processOutputChunk = (chunk: string) => {
    currentTurnOutputRef.current += chunk;
    const items = extractMemoryItemsFromText(currentTurnOutputRef.current);
    const cb = onMemoryItemExtractedRef.current;
    if (cb) {
      for (const item of items) {
        const key = getMemoryItemDedupKey(item);
        if (!extractedThisTurnRef.current.has(key)) {
          extractedThisTurnRef.current.add(key);
          cb(item);
        }
      }
    }
  };

  return {
    processOutputChunk,
    resetTurn,
  };
}
