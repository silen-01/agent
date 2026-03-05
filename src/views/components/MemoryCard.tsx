import { Trash2, X } from "lucide-react";
import { language } from "@modules";

export type MemoryCardProps = {
  items: string[];
  onClear: () => void;
  onRemoveItem?: (index: number) => void;
  height: number | null;
  isMd: boolean;
};

export const MemoryCard = ({ items, onClear, onRemoveItem, height, isMd }: MemoryCardProps) => {
  const { t } = language.useLanguage();

  return (
    <div
      className="min-w-0 min-h-0 overflow-hidden flex flex-col memory-cell md:flex-none"
      style={height != null && isMd ? { height: `${height}px` } : undefined}
    >
      <h2 className="text-xl mb-4 font-semibold shrink-0">{t("memoryTitle")}</h2>
      <div className="block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 min-h-0 flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 hover:border-red-500/70 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-sm font-medium"
            title={t("clearAgentMemory")}
          >
            <Trash2 size={18} />
            {t("clearAgentMemory")}
          </button>
        </div>
        <ul className="space-y-2 text-sm mt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-1">
          {items.map((item, i) => (
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
          ))}
        </ul>
      </div>
    </div>
  );
};
