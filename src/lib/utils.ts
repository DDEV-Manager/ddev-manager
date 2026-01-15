import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "running":
    case "OK":
      return "text-green-500";
    case "stopped":
      return "text-gray-400";
    case "paused":
    case "starting":
    case "stopping":
      return "text-yellow-500";
    default:
      return "text-red-500";
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case "running":
    case "OK":
      return "bg-green-500";
    case "stopped":
      return "bg-gray-400";
    case "paused":
    case "starting":
    case "stopping":
      return "bg-yellow-500";
    default:
      return "bg-red-500";
  }
}

export function formatProjectType(type: string): string {
  // Capitalize first letter and handle special cases
  const typeMap: Record<string, string> = {
    drupal: "Drupal",
    drupal6: "Drupal 6",
    drupal7: "Drupal 7",
    drupal8: "Drupal 8",
    drupal9: "Drupal 9",
    drupal10: "Drupal 10",
    drupal11: "Drupal 11",
    wordpress: "WordPress",
    typo3: "TYPO3",
    laravel: "Laravel",
    magento: "Magento",
    magento2: "Magento 2",
    shopware6: "Shopware 6",
    php: "PHP",
    backdrop: "Backdrop",
  };

  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path;

  // Truncate from the left, always showing the end of the path
  return "..." + path.slice(-(maxLength - 3));
}
