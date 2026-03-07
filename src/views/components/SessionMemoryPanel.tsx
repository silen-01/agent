import { MemoryBlock } from "./MemoryBlock.tsx";

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
}: SessionMemoryPanelProps) => (
  <MemoryBlock
    variant="panel"
    items={items}
    onClear={onClear}
    onRemoveItem={onRemoveItem}
    height={height}
    fillHeight={fillHeight}
    hideTitle={hideTitle}
  />
);
