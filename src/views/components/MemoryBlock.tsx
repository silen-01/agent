import { Trash2, X } from "lucide-react";
import { language } from "@modules";

type MemoryBlockBase = {
  items: string[];
  onRemoveItem?: (index: number) => void;
};

type MemoryBlockCard = MemoryBlockBase & {
  variant: "card";
  onClear: () => void;
  height: number | null;
  isMd: boolean;
};

type MemoryBlockPanel = MemoryBlockBase & {
  variant: "panel";
  onClear?: () => void;
  height?: number | null;
  fillHeight?: boolean;
  hideTitle?: boolean;
};

export type MemoryBlockProps = MemoryBlockCard | MemoryBlockPanel;

export const MemoryBlock = (props: MemoryBlockProps) => {
  const { variant, items, onRemoveItem } = props;
  const { t } = language.useLanguage();

  const isCard = variant === "card";

  const wrapperClass = isCard
    ? "min-w-0 min-h-0 overflow-hidden flex flex-col memory-cell md:flex-none"
    : `min-w-0 min-h-0 flex flex-col w-full overflow-hidden ${props.fillHeight ? "h-full" : ""}`;

  const wrapperStyle =
    isCard && props.height != null && props.isMd
      ? { height: `${props.height}px` }
      : !isCard && props.height != null
        ? { height: `${props.height}px` }
        : undefined;

  const titleClass = isCard ? "text-xl mb-4 font-semibold shrink-0" : "text-lg font-semibold mb-2 shrink-0";
  const showTitle = isCard || !props.hideTitle;

  const blockInnerClass = isCard
    ? "block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 min-h-0 flex-1 flex flex-col overflow-hidden"
    : `block-inner bg-[#111827] border border-gray-700 p-3 min-h-0 flex-1 flex flex-col overflow-hidden ${props.hideTitle ? "rounded-t-none border-t-0 rounded-b-2xl" : "rounded-2xl"}`;

  const showClear = isCard || props.onClear != null;
  const clearButtonClass = isCard
    ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 hover:border-red-500/70 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-sm font-medium"
    : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-red-500/70 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-sm font-medium";
  const clearIconSize = isCard ? 18 : 16;
  const clearWrapperClass = isCard ? "flex justify-center shrink-0" : "flex justify-center shrink-0 mb-3";

  const listTopClass = isCard ? "space-y-2 text-sm mt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-1" : "space-y-2 text-sm flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-1";

  const handleClear = () => {
    if (variant === "card") props.onClear();
    else if (props.onClear) props.onClear();
  };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {showTitle && <h2 className={titleClass}>{t("memoryTitle")}</h2>}
      <div className={blockInnerClass}>
        {showClear && (
          <div className={clearWrapperClass}>
            <button
              type="button"
              onClick={handleClear}
              className={clearButtonClass}
              title={t("clearAgentMemory")}
            >
              <Trash2 size={clearIconSize} />
              {t("clearAgentMemory")}
            </button>
          </div>
        )}
        <ul className={listTopClass}>
          {!isCard && items.length === 0 ? (
            <li className="text-gray-500 py-4 text-center">{t("memoryEmpty")}</li>
          ) : (
            items.map((item, i) => (
              <li
                key={i}
                className="group rounded-lg px-3 py-2.5 bg-[#0B1118]/70 border border-gray-700/60 text-gray-300 flex items-start gap-2"
              >
                <span className="min-w-0 flex-1">{item}</span>
                {onRemoveItem != null && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(i)}
                    className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition text-gray-500"
                    title={t("sessionMemoryRemove")}
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
