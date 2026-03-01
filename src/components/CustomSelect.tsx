import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

type CustomSelectProps = {
  value: string;
  options: readonly string[];
  getOptionLabel: (option: string) => string;
  onChange: (option: string) => void;
  id?: string;
  "aria-label"?: string;
};

export function CustomSelect(props: CustomSelectProps) {
  const { value, options, getOptionLabel, onChange, id, "aria-label": ariaLabel } = props;
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedLabel = getOptionLabel(value);

  const getItemClassName = (option: string) => {
    const isSelected = option === value;
    const base = "cursor-pointer py-2.5 pr-3 text-sm transition-colors duration-150 mx-1.5 rounded-md";
    if (isSelected) {
      return base + " pl-3 bg-blue-500/15 text-blue-400";
    }
    return base + " pl-3 text-gray-300 hover:bg-white/5 hover:text-white";
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
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
          role="listbox"
          aria-activedescendant={value}
          className="absolute z-50 mt-2 w-full rounded-xl border border-gray-700 bg-[#111827] py-1.5 shadow-xl shadow-black/50 ring-1 ring-white/5"
        >
          {options.map((option) => (
            <li
              key={option}
              role="option"
              id={option}
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(option);
                  setIsOpen(false);
                }
              }}
              className={getItemClassName(option)}
            >
              {getOptionLabel(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
