import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";

/**
 * Hook that applies theme and zoom settings to the document.
 * Should be called once at the app root level.
 */
export function useTheme() {
  const theme = useAppStore((state) => state.theme);
  const zoom = useAppStore((state) => state.zoom);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      // Determine if we should use dark mode
      let isDark = false;

      if (theme === "dark") {
        isDark = true;
      } else if (theme === "system") {
        isDark = mediaQuery.matches;
      }
      // theme === "light" means isDark stays false

      // Apply or remove dark class
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // Also set color-scheme for native elements (scrollbars, form controls)
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    // Apply immediately
    applyTheme();

    // Listen for system preference changes when in "system" mode
    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  // Apply zoom CSS variable
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--zoom", String(zoom / 100));
  }, [zoom]);
}
