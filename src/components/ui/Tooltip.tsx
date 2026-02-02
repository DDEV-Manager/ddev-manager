import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Position = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Delay in ms before showing tooltip (default: 200) */
  delay?: number;
  /** Preferred position of tooltip (default: "top"). Will auto-flip if not enough space. */
  position?: Position;
}

interface TooltipState {
  isVisible: boolean;
  x: number;
  y: number;
  actualPosition: Position;
}

const TOOLTIP_OFFSET = 8;
const VIEWPORT_PADDING = 8;
// Estimated tooltip dimensions for initial calculation
const ESTIMATED_HEIGHT = 32;
const ESTIMATED_WIDTH = 100;

export function Tooltip({ content, children, delay = 200, position = "top" }: TooltipProps) {
  const [state, setState] = useState<TooltipState>({
    isVisible: false,
    x: 0,
    y: 0,
    actualPosition: position,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = (
    triggerRect: DOMRect,
    preferredPosition: Position
  ): { x: number; y: number; actualPosition: Position } => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Calculate available space in each direction
    const spaceTop = triggerRect.top - VIEWPORT_PADDING;
    const spaceBottom = viewport.height - triggerRect.bottom - VIEWPORT_PADDING;
    const spaceLeft = triggerRect.left - VIEWPORT_PADDING;
    const spaceRight = viewport.width - triggerRect.right - VIEWPORT_PADDING;

    // Determine best position based on preferred position and available space
    let finalPosition = preferredPosition;

    if (preferredPosition === "top" && spaceTop < ESTIMATED_HEIGHT + TOOLTIP_OFFSET) {
      finalPosition = "bottom";
    } else if (preferredPosition === "bottom" && spaceBottom < ESTIMATED_HEIGHT + TOOLTIP_OFFSET) {
      finalPosition = "top";
    } else if (preferredPosition === "left" && spaceLeft < ESTIMATED_WIDTH + TOOLTIP_OFFSET) {
      finalPosition = "right";
    } else if (preferredPosition === "right" && spaceRight < ESTIMATED_WIDTH + TOOLTIP_OFFSET) {
      finalPosition = "left";
    }

    // Calculate coordinates based on final position
    let x = triggerRect.left + triggerRect.width / 2;
    let y = triggerRect.top;

    switch (finalPosition) {
      case "bottom":
        y = triggerRect.bottom + TOOLTIP_OFFSET;
        break;
      case "left":
        x = triggerRect.left - TOOLTIP_OFFSET;
        y = triggerRect.top + triggerRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + TOOLTIP_OFFSET;
        y = triggerRect.top + triggerRect.height / 2;
        break;
      case "top":
      default:
        y = triggerRect.top - TOOLTIP_OFFSET;
        break;
    }

    // Prevent horizontal overflow for top/bottom positions
    if (finalPosition === "top" || finalPosition === "bottom") {
      const halfWidth = ESTIMATED_WIDTH / 2;
      if (x - halfWidth < VIEWPORT_PADDING) {
        x = halfWidth + VIEWPORT_PADDING;
      } else if (x + halfWidth > viewport.width - VIEWPORT_PADDING) {
        x = viewport.width - halfWidth - VIEWPORT_PADDING;
      }
    }

    return { x, y, actualPosition: finalPosition };
  };

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const { x, y, actualPosition } = calculatePosition(triggerRect, position);
        setState({ isVisible: true, x, y, actualPosition });
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState((prev) => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses: Record<Position, string> = {
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2",
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
      >
        {children}
      </div>
      {state.isVisible &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[100] rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-gray-900",
              "animate-in fade-in-0 zoom-in-95 duration-100",
              positionClasses[state.actualPosition]
            )}
            style={{
              left: state.x,
              top: state.y,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
