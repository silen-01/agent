import { useCallback, useRef, useEffect, useState } from "react";
import { Minimize2 } from "lucide-react";

export type DraggablePanelProps = {
  title: string;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onClose?: () => void;
  children: React.ReactNode;
  /** Текущий размер окна в px (управляется снаружи, можно менять через onResize) */
  sizePx: { width: number; height: number };
  onResize?: (size: { width: number; height: number }) => void;
  /** Минимальный размер при ресайзе */
  minWidthPx?: number;
  minHeightPx?: number;
  /** Отступ снизу экрана, под который окно не должно заходить */
  bottomSafeAreaPx?: number;
  /** Границы другого окна, с которым нельзя пересекаться */
  otherPanelBounds?: { x: number; y: number; width: number; height: number } | null;
  /** Запрос на закрытие с анимацией (например при клике по вкладке) */
  closeRequested?: boolean;
  /** Дополнительные классы (без ширины/высоты) */
  className?: string;
};

const PADDING = 8;
const GAP = 12;
const DEFAULT_BOTTOM_SAFE = 120;
const DEFAULT_MIN_W = 200;
const DEFAULT_MIN_H = 120;

export const DraggablePanel = ({
  title,
  position,
  onPositionChange,
  onClose,
  children,
  sizePx,
  onResize,
  minWidthPx = DEFAULT_MIN_W,
  minHeightPx = DEFAULT_MIN_H,
  bottomSafeAreaPx = DEFAULT_BOTTOM_SAFE,
  otherPanelBounds = null,
  closeRequested = false,
  className = "",
}: DraggablePanelProps) => {
  const widthPx = sizePx.width;
  const heightPx = sizePx.height;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (closeRequested) setIsExiting(true);
  }, [closeRequested]);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const isDraggingRef = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const isResizingRef = useRef(false);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      let maxX = Math.max(0, window.innerWidth - widthPx - PADDING);
      let maxY = Math.max(0, window.innerHeight - bottomSafeAreaPx - heightPx);
      let x1 = Math.max(PADDING, Math.min(maxX, x));
      let y1 = Math.max(PADDING, Math.min(maxY, y));

      if (otherPanelBounds) {
        const o = otherPanelBounds;
        const ourRight = x1 + widthPx;
        const ourBottom = y1 + heightPx;
        const oRight = o.x + o.width;
        const oBottom = o.y + o.height;
        const overlapX = x1 < oRight + GAP && ourRight > o.x - GAP;
        const overlapY = y1 < oBottom + GAP && ourBottom > o.y - GAP;
        // Сдвигаем только при реальном пересечении (по обеим осям). Тогда сдвигаем по одной оси — по той, где смещение меньше (чтобы можно было ставить окна рядом по вертикали или горизонтали).
        if (overlapX && overlapY) {
          const putLeft = o.x - GAP - widthPx;
          const putRight = oRight + GAP;
          const putTop = o.y - GAP - heightPx;
          const putBottom = oBottom + GAP;
          const distLeft = Math.abs(x1 - putLeft);
          const distRight = Math.abs(x1 - putRight);
          const distTop = Math.abs(y1 - putTop);
          const distBottom = Math.abs(y1 - putBottom);
          const bestX = distLeft <= distRight ? putLeft : putRight;
          const bestY = distTop <= distBottom ? putTop : putBottom;
          const costX = Math.min(distLeft, distRight);
          const costY = Math.min(distTop, distBottom);
          if (costX <= costY) {
            x1 = Math.max(PADDING, Math.min(maxX, bestX));
          } else {
            y1 = Math.max(PADDING, Math.min(maxY, bestY));
          }
        }
      }

      return { x: x1, y: y1 };
    },
    [widthPx, heightPx, bottomSafeAreaPx, otherPanelBounds]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("[data-resize-handle]")) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      isDraggingRef.current = true;
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isResizingRef.current && onResize) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        const maxW = window.innerWidth - position.x - PADDING;
        const maxH = window.innerHeight - position.y - bottomSafeAreaPx - PADDING;
        const newW = Math.max(minWidthPx, Math.min(maxW, resizeStart.current.w + dw));
        const newH = Math.max(minHeightPx, Math.min(maxH, resizeStart.current.h + dh));
        onResize({ width: newW, height: newH });
        return;
      }
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const next = clampPosition(
        dragStart.current.posX + dx,
        dragStart.current.posY + dy
      );
      onPositionChange(next);
    },
    [onPositionChange, onResize, clampPosition, position, bottomSafeAreaPx, minWidthPx, minHeightPx]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
  }, []);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onResize) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: widthPx,
        h: heightPx,
      };
      isResizingRef.current = true;
    },
    [onResize, widthPx, heightPx]
  );

  useEffect(() => {
    const onGlobalPointerUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => window.removeEventListener("pointerup", onGlobalPointerUp);
  }, []);

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (e.animationName === "floating-panel-out" && isExiting && onClose) {
        onClose();
      }
    },
    [isExiting, onClose]
  );

  return (
    <div
      className={`fixed flex flex-col rounded-2xl border border-gray-700 bg-[#111827] shadow-xl overflow-hidden ${className} ${isExiting ? "floating-panel-out" : "floating-panel-in"}`}
      style={{
        left: position.x,
        top: position.y,
        width: widthPx,
        height: heightPx,
        zIndex: 50,
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800/80 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <span className="text-sm font-medium text-gray-200 truncate">{title}</span>
        {onClose != null && (
          <button
            type="button"
            onClick={() => {
              setIsExiting(true);
            }}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 transition"
            title="Свернуть"
          >
            <Minimize2 size={16} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden relative">
        {children}
        {onResize && (
          <div
            data-resize-handle
            role="presentation"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
            title="Изменить размер"
          >
            <svg width={12} height={12} viewBox="0 0 12 12" className="text-gray-500 shrink-0" aria-hidden>
              <path d="M12 12V8L8 12H12ZM12 8V4L4 12H8L12 8Z" fill="currentColor" opacity={0.6} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
