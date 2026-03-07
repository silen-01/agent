import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

type CustomSelectProps = {
  value: string;
  options: readonly string[];
  getOptionLabel: (option: string) => string;
  onChange: (option: string) => void;
  id?: string;
  "aria-label"?: string;
};

const listboxId = (selectId: string | undefined) => (selectId ? `${selectId}-listbox` : undefined);

export const CustomSelect = (props: CustomSelectProps) => {
  const { value, options, getOptionLabel, onChange, id, "aria-label": ariaLabel } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.indexOf(value);
  const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setFocusedIndex(safeSelectedIndex);
      listRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen, safeSelectedIndex]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!isOpen) open();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) open();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % n);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i - 1 + n) % n);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const option = options[focusedIndex];
      if (option != null) {
        onChange(option);
        close();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const selectedLabel = getOptionLabel(value);

  const getItemClassName = (option: string) => {
    const isSelected = option === value;
    const base = "cursor-pointer py-2.5 pr-3 text-sm transition-colors duration-150 mx-1.5 rounded-md";
    if (isSelected) {
      return base + " pl-3 bg-blue-500/15 text-blue-400";
    }
    return base + " pl-3 text-gray-300 hover:bg-white/5 hover:text-white";
  };

  const listboxIdVal = listboxId(id);
  const activeId = listboxIdVal ? `${listboxIdVal}-option-${focusedIndex}` : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxIdVal}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleButtonKeyDown}
        className={
          "w-full flex items-center justify-between gap-2 rounded-xl pl-3 pr-10 py-2.5 text-sm text-left transition-colors duration-150 " +
          (isOpen
            ? "bg-[#0B1118] border-2 border-blue-500/50 ring-2 ring-blue-500/20"
            : "bg-[#0B1118] border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50")
        }
      >
        <span className="text-gray-100">{selectedLabel}</span>
        <ChevronDown
          className={"w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 " + (isOpen ? "rotate-180 text-blue-400" : "")}
          style={{ position: "absolute", right: "0.75rem" }}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxIdVal}
          role="listbox"
          tabIndex={0}
          aria-activedescendant={activeId}
          aria-label={ariaLabel ?? undefined}
          className="absolute z-50 mt-2 w-full rounded-xl border border-gray-700 bg-[#111827] py-1.5 shadow-xl shadow-black/50 ring-1 ring-white/5 outline-none"
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, i) => (
            <li
              key={option}
              role="option"
              id={listboxIdVal ? `${listboxIdVal}-option-${i}` : undefined}
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                close();
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={getItemClassName(option)}
            >
              {getOptionLabel(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
