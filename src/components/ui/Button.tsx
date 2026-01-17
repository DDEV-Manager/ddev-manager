import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "danger-solid"
  | "warning"
  | "warning-solid"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700",
  secondary:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700",
  success:
    "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
  danger:
    "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
  "danger-solid": "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  "warning-solid": "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500",
  warning:
    "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50",
  ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-sm gap-2",
  icon: "p-2",
  "icon-sm": "p-1.5",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-4 w-4",
  icon: "h-4 w-4",
  "icon-sm": "h-3.5 w-3.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const iconSize = iconSizeStyles[size];

    const renderIcon = () => {
      if (loading) {
        return <Loader2 className={cn(iconSize, "animate-spin")} />;
      }
      return icon;
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus:ring-2 focus:ring-offset-2 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {iconPosition === "left" && renderIcon()}
        {children}
        {iconPosition === "right" && renderIcon()}
      </button>
    );
  }
);

Button.displayName = "Button";
