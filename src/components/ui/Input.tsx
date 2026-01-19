import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("min-w-0 flex-1", containerClassName)}>
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
            "focus:border-primary-500 focus:ring-primary-500 focus:ring-1 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
