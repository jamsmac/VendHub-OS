import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  cn,
  formatPrice,
  calculateDistance,
  getMachineTypeIcon,
  getMachineStatusColor,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/utils";

// Ensure i18n is initialised with Russian before util functions are called
beforeAll(async () => {
  const i18n = (await import("@/i18n")).default;
  await i18n.changeLanguage("ru");
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});

describe("formatPrice", () => {
  it("formats price with UZS suffix", () => {
    const result = formatPrice(15000);
    expect(result).toContain("15");
    expect(result).toContain("000");
    expect(result).toContain("UZS");
  });
});

describe("formatNumber", () => {
  it("formats number with thousand separators", () => {
    const result = formatNumber(1500000);
    expect(result).toMatch(/1.*500.*000/);
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatCurrency", () => {
  it("formats with сум suffix", () => {
    const result = formatCurrency(25000);
    expect(result).toContain("25");
    expect(result).toContain("сум");
  });
});

describe("calculateDistance", () => {
  it("returns 0 for same coordinates", () => {
    expect(calculateDistance(41.3, 69.28, 41.3, 69.28)).toBe(0);
  });

  it("calculates distance between Tashkent and Samarkand (~270km)", () => {
    const distance = calculateDistance(41.3, 69.28, 39.65, 66.96);
    const km = distance / 1000;
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(300);
  });

  it("returns meters", () => {
    // ~1km between two close points
    const distance = calculateDistance(41.3, 69.28, 41.309, 69.28);
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1100);
  });
});

describe("getMachineTypeIcon", () => {
  it("returns coffee icon for coffee type", () => {
    expect(getMachineTypeIcon("coffee")).toBe("☕");
  });

  it("returns snack icon for snack type", () => {
    expect(getMachineTypeIcon("snack")).toBe("🍫");
  });

  it("returns default icon for unknown type", () => {
    expect(getMachineTypeIcon("unknown")).toBe("🏪");
  });
});

describe("getMachineStatusColor", () => {
  it("returns green for active", () => {
    expect(getMachineStatusColor("active")).toContain("green");
  });

  it("returns red for inactive", () => {
    expect(getMachineStatusColor("inactive")).toContain("red");
  });

  it("returns yellow for maintenance", () => {
    expect(getMachineStatusColor("maintenance")).toContain("yellow");
  });

  it("returns gray for unknown", () => {
    expect(getMachineStatusColor("unknown")).toContain("gray");
  });
});

describe("formatRelativeTime", () => {
  it('returns "только что" for recent time', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("только что");
  });

  it("returns minutes ago for recent past", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5 мин назад");
  });

  it("returns hours ago for same day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3 ч назад");
  });

  it("returns days ago for recent days", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe("2 дн назад");
  });
});
