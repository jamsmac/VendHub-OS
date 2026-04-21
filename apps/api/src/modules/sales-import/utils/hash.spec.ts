import { djb2Hash, hashRow, hashTxn } from "./hash";

describe("hash utils (DJB2)", () => {
  describe("djb2Hash", () => {
    it("is deterministic", () => {
      expect(djb2Hash("hello")).toBe(djb2Hash("hello"));
    });

    it("produces different hashes for different inputs", () => {
      expect(djb2Hash("hello")).not.toBe(djb2Hash("world"));
      expect(djb2Hash("abc")).not.toBe(djb2Hash("abd"));
    });

    it("returns 8-char lowercase hex", () => {
      const h = djb2Hash("anything");
      expect(h).toMatch(/^[0-9a-f]{8}$/);
    });

    it("handles empty string deterministically", () => {
      expect(djb2Hash("")).toBe(djb2Hash(""));
    });

    it("handles non-ASCII (cyrillic, chinese)", () => {
      const h1 = djb2Hash("Кока-Кола");
      const h2 = djb2Hash("其他");
      expect(h1).toMatch(/^[0-9a-f]{8}$/);
      expect(h2).toMatch(/^[0-9a-f]{8}$/);
      expect(h1).not.toBe(h2);
    });
  });

  describe("hashRow", () => {
    it("is stable for identical rows", () => {
      const cols = ["499", "499", "Fanta Classic", "10000.00", "1"];
      expect(hashRow("2026-04-21", "m-1", cols)).toBe(
        hashRow("2026-04-21", "m-1", cols),
      );
    });

    it("changes when any column changes", () => {
      const base = ["499", "499", "Fanta", "10000", "1"];
      const diff = ["499", "499", "Fanta", "10000", "2"];
      expect(hashRow("2026-04-21", "m-1", base)).not.toBe(
        hashRow("2026-04-21", "m-1", diff),
      );
    });

    it("changes when machine or day differs", () => {
      const cols = ["499", "499", "Fanta", "10000", "1"];
      expect(hashRow("2026-04-21", "m-1", cols)).not.toBe(
        hashRow("2026-04-21", "m-2", cols),
      );
      expect(hashRow("2026-04-21", "m-1", cols)).not.toBe(
        hashRow("2026-04-22", "m-1", cols),
      );
    });
  });

  describe("hashTxn", () => {
    it("combines txn ID and product ID", () => {
      expect(hashTxn("ABC-123", "p1")).not.toBe(hashTxn("ABC-123", "p2"));
      expect(hashTxn("ABC-123", "p1")).not.toBe(hashTxn("ABC-124", "p1"));
    });
  });
});
