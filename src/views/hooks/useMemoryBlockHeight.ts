import { useState, useEffect, type RefObject } from "react";

export const useMemoryBlockHeight = (
  leftColRef: RefObject<HTMLDivElement | null>,
  hasMemory: boolean
) => {
  const [memoryBlockHeight, setMemoryBlockHeight] = useState<number | null>(null);
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const timer = setTimeout(() => setIsMd(m.matches), 0);
    const f = () => setIsMd(m.matches);
    m.addEventListener("change", f);
    return () => {
      clearTimeout(timer);
      m.removeEventListener("change", f);
    };
  }, []);

  useEffect(() => {
    if (!hasMemory) {
      const timer = setTimeout(() => setMemoryBlockHeight(null), 0);
      return () => clearTimeout(timer);
    }
    const el = leftColRef.current;
    if (!el) return;
    const updateHeight = () => setMemoryBlockHeight(el.offsetHeight);
    const timer = setTimeout(updateHeight, 0);
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [hasMemory, leftColRef]);

  return { memoryBlockHeight, isMd };
};
