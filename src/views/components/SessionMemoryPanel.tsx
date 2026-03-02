import { Trash2, X } from "lucide-react";
import { language } from "@modules";

export type SessionMemoryPanelProps = {
  items: string[];
  onClear?: () => void;
  onRemoveItem?: (index: number) => void;
  height?: number | null;
  /** Заполнять высоту родителя (для фиксированной обёртки) */
  fillHeight?: boolean;
  /** Скрыть заголовок (когда панель в окне с собственным заголовком) */
  hideTitle?: boolean;
};

export const SessionMemoryPanel = ({
  items,
  onClear,
  onRemoveItem,
  height,
  fillHeight = false,
  hideTitle = false,
}: SessionMemoryPanelProps) => {
  const { t } = language.useLanguage();

  return (
    <div
      className={`min-w-0 min-h-0 flex flex-col w-full overflow-hidden ${fillHeight ? "h-full" : ""}`}
      style={height != null ? { height: `${height}px` } : undefined}
    >
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-2 shrink-0">{t("memoryTitle")}</h2>
      )}
      <div className={`block-inner bg-[#111827] border border-gray-700 p-3 min-h-0 flex-1 flex flex-col overflow-hidden ${hideTitle ? "rounded-t-none border-t-0 rounded-b-2xl" : "rounded-2xl"}`}>
        {onClear != null && (
          <div className="flex justify-center shrink-0 mb-3">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-red-500/70 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-sm font-medium"
              title={t("clearAgentMemory")}
            >
              <Trash2 size={16} />
              {t("clearAgentMemory")}
            </button>
          </div>
        )}
        <ul className="space-y-2 text-sm flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-1">
          {items.length === 0 ? (
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
