import { cn } from "@/lib/utils";

interface ButtonGroupOption<T extends string> {
  value: T;
  label: string;
}

interface ButtonGroupProps<T extends string> {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: ButtonGroupProps<T>) {
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <div
      className={cn(
        "flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800",
        disabled && "opacity-50",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md font-medium transition-colors",
            sizeStyles[size],
            value === option.value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
            disabled && "cursor-not-allowed"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
