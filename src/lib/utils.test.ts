import { describe, it, expect } from "vitest";
import {
  cn,
  getStatusColor,
  getStatusBgColor,
  formatProjectType,
  truncatePath,
} from "./utils";

describe("cn (class name merger)", () => {
  it("should merge multiple class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe("base visible");
  });

  it("should handle undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("should handle arrays", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("should handle objects", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("getStatusColor", () => {
  it("should return green for running status", () => {
    expect(getStatusColor("running")).toBe("text-green-500");
  });

  it("should return green for OK status", () => {
    expect(getStatusColor("OK")).toBe("text-green-500");
  });

  it("should return gray for stopped status", () => {
    expect(getStatusColor("stopped")).toBe("text-gray-400");
  });

  it("should return yellow for paused status", () => {
    expect(getStatusColor("paused")).toBe("text-yellow-500");
  });

  it("should return yellow for starting status", () => {
    expect(getStatusColor("starting")).toBe("text-yellow-500");
  });

  it("should return yellow for stopping status", () => {
    expect(getStatusColor("stopping")).toBe("text-yellow-500");
  });

  it("should return red for unknown status", () => {
    expect(getStatusColor("error")).toBe("text-red-500");
    expect(getStatusColor("unknown")).toBe("text-red-500");
  });
});

describe("getStatusBgColor", () => {
  it("should return correct background colors for each status", () => {
    expect(getStatusBgColor("running")).toBe("bg-green-500");
    expect(getStatusBgColor("OK")).toBe("bg-green-500");
    expect(getStatusBgColor("stopped")).toBe("bg-gray-400");
    expect(getStatusBgColor("paused")).toBe("bg-yellow-500");
    expect(getStatusBgColor("starting")).toBe("bg-yellow-500");
    expect(getStatusBgColor("stopping")).toBe("bg-yellow-500");
    expect(getStatusBgColor("error")).toBe("bg-red-500");
  });
});

describe("formatProjectType", () => {
  it("should format known project types correctly", () => {
    expect(formatProjectType("drupal")).toBe("Drupal");
    expect(formatProjectType("drupal10")).toBe("Drupal 10");
    expect(formatProjectType("drupal11")).toBe("Drupal 11");
    expect(formatProjectType("wordpress")).toBe("WordPress");
    expect(formatProjectType("typo3")).toBe("TYPO3");
    expect(formatProjectType("laravel")).toBe("Laravel");
    expect(formatProjectType("magento2")).toBe("Magento 2");
    expect(formatProjectType("shopware6")).toBe("Shopware 6");
    expect(formatProjectType("php")).toBe("PHP");
    expect(formatProjectType("backdrop")).toBe("Backdrop");
  });

  it("should capitalize first letter for unknown types", () => {
    expect(formatProjectType("custom")).toBe("Custom");
    expect(formatProjectType("myframework")).toBe("Myframework");
  });

  it("should handle empty string", () => {
    expect(formatProjectType("")).toBe("");
  });
});

describe("truncatePath", () => {
  it("should not truncate paths shorter than maxLength", () => {
    expect(truncatePath("/home/user/project", 40)).toBe("/home/user/project");
  });

  it("should truncate long paths with ellipsis", () => {
    const longPath = "/home/user/very/long/path/to/my/awesome/project";
    const result = truncatePath(longPath, 30);
    expect(result).toContain(".../");
    expect(result.length).toBeLessThanOrEqual(34); // 30 + ".../".length
  });

  it("should preserve the most relevant end of the path", () => {
    const path = "/home/user/projects/myproject";
    const result = truncatePath(path, 20);
    expect(result).toContain("myproject");
  });

  it("should use default maxLength of 40", () => {
    const shortPath = "/home/user/project";
    expect(truncatePath(shortPath)).toBe(shortPath);
  });

  it("should handle single segment paths", () => {
    expect(truncatePath("project")).toBe("project");
  });

  it("should handle paths at exact maxLength", () => {
    const path = "/home/user/project"; // 18 chars
    expect(truncatePath(path, 18)).toBe(path);
  });
});
