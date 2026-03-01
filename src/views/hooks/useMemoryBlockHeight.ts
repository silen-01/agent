import { useState, useEffect, type RefObject } from "react";

export const useMemoryBlockHeight = (
  leftColRef: RefObject<HTMLDivElement | null>,
  hasMemory: boolean
) => {
  const [memoryBlockHeight, setMemoryBlockHeight] = useState<number | null>(null);
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    setIsMd(m.matches);
    const f = () => setIsMd(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    if (!hasMemory) {
      setMemoryBlockHeight(null);
      return;
    }
    const el = leftColRef.current;
    if (!el) return;
    const updateHeight = () => setMemoryBlockHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasMemory]);

  return { memoryBlockHeight, isMd };
};
