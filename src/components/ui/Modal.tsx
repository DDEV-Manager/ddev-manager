import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Whether to constrain height and allow scrolling */
  scrollable?: boolean;
  /** Accessible label ID for the modal */
  ariaLabelledBy?: string;
  /** Whether clicking outside the modal closes it (default: true) */
  closeOnClickOutside?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "md",
  className,
  scrollable = false,
  ariaLabelledBy,
  closeOnClickOutside = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle animation end to unmount after close animation
  const handleAnimationEnd = useCallback(() => {
    if (!isOpen && containerRef.current) {
      containerRef.current.style.display = "none";
    }
  }, [isOpen]);

  // Show/hide and trigger animations
  useEffect(() => {
    if (containerRef.current) {
      if (isOpen) {
        containerRef.current.style.display = "flex";
      }
      // Animation classes will handle fade out, handleAnimationEnd will hide after animation
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!closeOnClickOutside) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close on the click that opened the modal
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose, closeOnClickOutside]);

  return createPortal(
    <div
      ref={containerRef}
      onAnimationEnd={handleAnimationEnd}
      style={{ display: isOpen ? "flex" : "none" }}
      className={cn(
        "fixed inset-0 z-50 items-center justify-center bg-white/20 backdrop-blur-md duration-200 dark:bg-gray-900/30",
        isOpen ? "animate-in fade-in" : "animate-out fade-out"
      )}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "mx-4 w-full rounded-xl border border-white/90 bg-white/30 p-6 shadow-2xl duration-200 dark:border-white/10 dark:bg-gray-900/70",
          isOpen ? "animate-in fade-in zoom-in-95" : "animate-out fade-out zoom-out-95",
          maxWidthClasses[maxWidth],
          scrollable && "max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
