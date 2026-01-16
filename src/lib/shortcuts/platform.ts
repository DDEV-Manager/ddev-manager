/**
 * Platform detection utility for keyboard shortcuts.
 * Detects Mac vs Windows/Linux for Cmd vs Ctrl key handling.
 */

export type Platform = "mac" | "windows" | "linux";

export function detectPlatform(): Platform {
  // Use userAgentData if available (modern approach)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userAgentData = (navigator as any).userAgentData as { platform?: string } | undefined;
  if (userAgentData?.platform) {
    const platform = userAgentData.platform.toLowerCase();
    if (platform.includes("mac")) return "mac";
    if (platform.includes("win")) return "windows";
    return "linux";
  }

  // Fallback to navigator.platform (deprecated but widely supported)
  const platform = navigator.platform?.toLowerCase() ?? "";
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  return "linux";
}

export function isMac(): boolean {
  return detectPlatform() === "mac";
}

/**
 * Returns the appropriate modifier key for the platform.
 * Mac: metaKey (Cmd), Windows/Linux: ctrlKey
 */
export function getModifierKey(): "metaKey" | "ctrlKey" {
  return isMac() ? "metaKey" : "ctrlKey";
}

/**
 * Returns display string for modifier key.
 * Useful for UI hints like "Cmd+I" or "Ctrl+I"
 */
export function getModifierDisplay(): string {
  return isMac() ? "\u2318" : "Ctrl";
}
