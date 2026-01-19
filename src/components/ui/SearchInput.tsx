import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative min-w-[120px] flex-1", containerClassName)}>
      <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        className={cn(
          "w-full rounded border border-gray-300 bg-white py-1 pr-2 pl-7 text-sm",
          "dark:border-gray-600 dark:bg-gray-700",
          "focus:border-primary-500 focus:ring-primary-500 focus:ring-1 focus:outline-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
