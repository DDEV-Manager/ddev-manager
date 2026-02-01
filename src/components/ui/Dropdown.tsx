import { useState, useRef, useEffect, useId, useCallback, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  minWidth?: string;
  className?: string;
  /** Accessible label for the dropdown */
  ariaLabel?: string;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  minWidth = "70px",
  className,
  ariaLabel,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const listboxId = useId();
  const shouldFocusOnOpen = useRef(false);

  const selectedIndex = options.findIndex((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Open handler that sets initial focus index
  const openDropdown = useCallback(() => {
    const indexToFocus = selectedIndex >= 0 ? selectedIndex : 0;
    setFocusedIndex(indexToFocus);
    shouldFocusOnOpen.current = true;
    setIsOpen(true);
  }, [selectedIndex]);

  // Focus the option when the listbox mounts
  const listboxRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && shouldFocusOnOpen.current) {
        shouldFocusOnOpen.current = false;
        const indexToFocus = selectedIndex >= 0 ? selectedIndex : 0;
        requestAnimationFrame(() => {
          optionRefs.current.get(indexToFocus)?.focus();
        });
      }
    },
    [selectedIndex]
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Enter":
      case " ":
        e.preventDefault();
        openDropdown();
        break;
    }
  };

  const handleOptionKeyDown = (e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (index < options.length - 1) {
          setFocusedIndex(index + 1);
          optionRefs.current.get(index + 1)?.focus();
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
          optionRefs.current.get(index - 1)?.focus();
        }
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        optionRefs.current.get(0)?.focus();
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        optionRefs.current.get(options.length - 1)?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onChange(options[index].value);
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className="focus-visible:ring-primary-500 flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-700"
      >
        <span style={{ minWidth }}>{selectedOption?.label ?? value}</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `${listboxId}-option-${focusedIndex}` : undefined
          }
          className="absolute top-full left-0 z-10 mt-1 rounded border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(el) => {
                if (el) optionRefs.current.set(index, el);
                else optionRefs.current.delete(index);
              }}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setFocusedIndex(-1);
                triggerRef.current?.focus();
              }}
              onKeyDown={(e) => handleOptionKeyDown(e, index)}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm focus:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-600",
                option.value === value && "bg-primary-50 dark:bg-primary-900/30",
                index === focusedIndex && "bg-gray-100 dark:bg-gray-600"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
