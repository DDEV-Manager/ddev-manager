import { type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

export function Toggle({ enabled, onChange, disabled = false, size = "md", label }: ToggleProps) {
  // Thumb starts at left-0.5 (2px). When enabled, translate by (track - thumb - 4px padding)
  // sm: 36px - 16px - 4px = 16px
  // md: 44px - 20px - 4px = 20px
  const sizeStyles = {
    sm: {
      track: "h-5 w-9",
      thumb: "h-4 w-4",
      translateOn: "translate-x-4",
    },
    md: {
      track: "h-6 w-11",
      thumb: "h-5 w-5",
      translateOn: "translate-x-5",
    },
  };

  const styles = sizeStyles[size];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) {
        onChange(!enabled);
      }
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      onKeyDown={handleKeyDown}
      className={cn(
        "focus:ring-primary-500 relative rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none",
        styles.track,
        enabled ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform",
          styles.thumb,
          enabled && styles.translateOn
        )}
      />
    </button>
  );
}
