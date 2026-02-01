import { useRef, type ReactNode, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  /** ID prefix for aria-controls (panel IDs should be `${ariaPrefix}-panel-${tabId}`) */
  ariaPrefix?: string;
}

export function Tabs({ tabs, activeTab, onChange, className, ariaPrefix = "tabs" }: TabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let newIndex: number | null = null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== null) {
      const newTab = tabs[newIndex];
      onChange(newTab.id);
      tabRefs.current.get(newTab.id)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={cn("flex gap-1 border-b border-gray-200 dark:border-gray-700", className)}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${ariaPrefix}-panel-${tab.id}`}
            id={`${ariaPrefix}-tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "focus-visible:ring-primary-500 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isActive
                ? "border-primary-500 text-primary-600 dark:text-primary-400 border-b-2"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
