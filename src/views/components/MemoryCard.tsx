import { MemoryBlock } from "./MemoryBlock.tsx";

export type MemoryCardProps = {
  items: string[];
  onClear: () => void;
  onRemoveItem?: (index: number) => void;
  height: number | null;
  isMd: boolean;
};

export const MemoryCard = ({ items, onClear, onRemoveItem, height, isMd }: MemoryCardProps) => (
  <MemoryBlock
    variant="card"
    items={items}
    onClear={onClear}
    onRemoveItem={onRemoveItem}
    height={height}
    isMd={isMd}
  />
);
