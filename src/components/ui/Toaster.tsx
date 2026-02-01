import { useToastStore, type Toast } from "@/stores/toastStore";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: {
    container:
      "bg-green-50/90 border-green-200/50 backdrop-blur-sm dark:bg-green-900/30 dark:border-green-800/50",
    icon: "text-green-500 dark:text-green-400",
    title: "text-green-800 dark:text-green-200",
    message: "text-green-700 dark:text-green-300",
  },
  error: {
    container:
      "bg-red-50/90 border-red-200/50 backdrop-blur-sm dark:bg-red-900/30 dark:border-red-800/50",
    icon: "text-red-500 dark:text-red-400",
    title: "text-red-800 dark:text-red-200",
    message: "text-red-700 dark:text-red-300",
  },
  info: {
    container:
      "bg-primary-50/90 border-primary-200/50 backdrop-blur-sm dark:bg-primary-900/30 dark:border-primary-800/50",
    icon: "text-primary-500 dark:text-primary-400",
    title: "text-primary-800 dark:text-primary-200",
    message: "text-primary-700 dark:text-primary-300",
  },
  warning: {
    container:
      "bg-amber-50/90 border-amber-200/50 backdrop-blur-sm dark:bg-amber-900/30 dark:border-amber-800/50",
    icon: "text-amber-500 dark:text-amber-400",
    title: "text-amber-800 dark:text-amber-200",
    message: "text-amber-700 dark:text-amber-300",
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismissToast } = useToastStore();
  const Icon = icons[toast.type];
  const style = styles[toast.type];

  // Use role="alert" for errors, role="status" for others
  const role = toast.type === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg",
        toast.exiting
          ? "animate-out slide-out-to-left fade-out duration-200"
          : "animate-in slide-in-from-left fade-in duration-300",
        style.container
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", style.icon)} aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className={cn("text-sm font-medium", style.title)}>{toast.title}</p>
        {toast.message && <p className={cn("text-sm", style.message)}>{toast.message}</p>}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          "shrink-0 rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
          style.icon
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
