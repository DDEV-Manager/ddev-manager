import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  const iconColors = {
    danger: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    default: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const confirmButtonVariant = {
    danger: "danger-solid" as const,
    warning: "warning-solid" as const,
    default: "primary" as const,
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabelledBy="dialog-title" className="relative">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCancel}
        icon={<X className="h-5 w-5" />}
        className="absolute top-4 right-4"
      />

      {/* Icon and title */}
      <div className="flex items-start gap-4">
        <div className={cn("shrink-0 rounded-full p-2", iconColors[variant])}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          ref={confirmButtonRef}
          variant={confirmButtonVariant[variant]}
          size="lg"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
