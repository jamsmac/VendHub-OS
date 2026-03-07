import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/lib/store";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: "system",
      language: "ru",
      notificationsEnabled: true,
    });
  });

  it("defaults to system theme", () => {
    expect(useUIStore.getState().theme).toBe("system");
  });

  it("defaults to Russian language", () => {
    expect(useUIStore.getState().language).toBe("ru");
  });

  it("sets theme", () => {
    useUIStore.getState().setTheme("dark");
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("sets language", () => {
    useUIStore.getState().setLanguage("uz");
    expect(useUIStore.getState().language).toBe("uz");
  });

  it("toggles notifications", () => {
    useUIStore.getState().setNotifications(false);
    expect(useUIStore.getState().notificationsEnabled).toBe(false);
    useUIStore.getState().setNotifications(true);
    expect(useUIStore.getState().notificationsEnabled).toBe(true);
  });
});
