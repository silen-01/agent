import { useRef } from "react";

import { type AgentSettings } from "@types";
import { AgentCard, ControlsCard, MemoryCard } from "./components";
import { language } from "@modules";
import { useMemoryBlockHeight } from "./hooks";

type ControlsPatch = Partial<Pick<AgentSettings, "microphone" | "screenShare" | "camera">>;

type InitialPageProps = {
  settings: AgentSettings;
  onSettingsChange: (patch: Partial<Pick<AgentSettings, "microphone" | "screenShare" | "camera">>) => void;
  memoryItems: string[];
  onLaunch: () => void;
  onClearMemory: () => void;
  onRemoveMemoryItem?: (index: number) => void;
  onOpenSettings: () => void;
};

export const InitialPage = ({
  settings,
  onSettingsChange,
  memoryItems,
  onLaunch,
  onClearMemory,
  onRemoveMemoryItem,
  onOpenSettings,
}: InitialPageProps) => {
  const leftColRef = useRef<HTMLDivElement>(null);
  const prefetchStartedRef = useRef(false);
  const { memoryBlockHeight, isMd } = useMemoryBlockHeight(leftColRef, memoryItems.length > 0);
  const { t } = language.useLanguage();

  const prefetchSessionChunk = () => {
    if (prefetchStartedRef.current) return;
    prefetchStartedRef.current = true;
    void import("@views/AgentSessionPage");
  };

  return (
    <div className="initial-page flex-1 flex flex-col items-center justify-center min-h-0">
      <div
        className={
          "initial-page__content w-full flex flex-col gap-6 transition-[opacity,transform] duration-400 ease-out " +
          (memoryItems.length > 0 ? "max-w-4xl" : "max-w-2xl")
        }
      >
        <div
          className={"gap-6 " + (memoryItems.length > 0 ? "grid grid-cols-1 md:grid-cols-2 grid-rows-[auto]" : "flex flex-col")}
        >
          <div
            ref={leftColRef}
            className={"min-w-0 flex flex-col gap-6 " + (memoryItems.length > 0 ? "md:h-fit" : "")}
          >
            <AgentCard settings={settings} onOpenSettings={onOpenSettings} />
            <ControlsCard
              settings={settings}
              onSettingsChange={(patch: ControlsPatch) => onSettingsChange(patch)}
            />
          </div>

          {memoryItems.length > 0 && (
            <MemoryCard
              items={memoryItems}
              onClear={onClearMemory}
              onRemoveItem={onRemoveMemoryItem}
              height={memoryBlockHeight}
              isMd={isMd}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onLaunch}
            onMouseEnter={prefetchSessionChunk}
            onFocus={prefetchSessionChunk}
            className="w-1/2 min-w-[140px] py-3 px-4 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("launchAgent")}
          </button>
        </div>
      </div>
    </div>
  );
};
