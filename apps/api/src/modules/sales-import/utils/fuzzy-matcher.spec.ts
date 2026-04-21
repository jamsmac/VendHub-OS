import {
  matchProductName,
  normalizeProductName,
  similarityScore,
} from "./fuzzy-matcher";

describe("fuzzy-matcher", () => {
  describe("normalizeProductName", () => {
    it("strips BOM, tabs, and lowercases", () => {
      expect(normalizeProductName("\uFEFFCoca Cola\t")).toBe("coca cola");
    });

    it("strips standalone unit words (CAN)", () => {
      const s = normalizeProductName("Fanta Classic CAN 250ml");
      expect(s).toContain("fanta");
      expect(s).toContain("classic");
      expect(s).not.toContain("can");
    });

    it("collapses whitespace", () => {
      expect(normalizeProductName("Coca   Cola   Classic")).toBe(
        "coca cola classic",
      );
    });

    it("strips punctuation and lowercases", () => {
      // Hyphen and comma become spaces; tokens split out
      const s = normalizeProductName("Red-Bull, 0.25");
      expect(s).toBe("red bull 0 25");
    });
  });

  describe("similarityScore", () => {
    it("returns 1.0 for identical (after normalization)", () => {
      expect(similarityScore("Coca Cola", "Coca Cola")).toBe(1);
      expect(similarityScore("COCA COLA", "coca  cola")).toBe(1);
    });

    it("returns 0 for empty", () => {
      expect(similarityScore("", "Coca")).toBe(0);
      expect(similarityScore("Coca", "")).toBe(0);
    });

    it("scores brand-matching pairs above threshold", () => {
      // Both sides share tokens in KNOWN_BRANDS ("coca", "cola")
      const score = similarityScore(
        "Coca Cola Classic 250ml",
        "Coca Cola Classic",
      );
      expect(score).toBeGreaterThanOrEqual(0.4);
    });

    it("penalizes strong brand mismatch (different dominant brands)", () => {
      // Use brands that share NO tokens: "Snickers" vs "Fanta Classic"
      const score = similarityScore("Snickers Bar", "Fanta Classic");
      expect(score).toBeLessThan(0.4);
    });

    it("gives substring bonus", () => {
      const a = similarityScore("Fanta", "Fanta Classic Can");
      expect(a).toBeGreaterThan(0.3);
    });
  });

  describe("matchProductName", () => {
    const candidates = [
      { productId: "p-fanta", name: "Fanta Classic" },
      { productId: "p-coca", name: "Coca Cola Classic" },
      { productId: "p-pepsi", name: "Pepsi Cola" },
    ];

    it("picks best match above threshold", () => {
      const m = matchProductName("Fanta Classic CAN 250ml\t", candidates);
      expect(m).not.toBeNull();
      expect(m!.productId).toBe("p-fanta");
    });

    it("returns null when nothing crosses threshold", () => {
      const m = matchProductName("Completely Unrelated Item XYZ", candidates);
      expect(m).toBeNull();
    });

    it("prefers higher score when multiple match", () => {
      // Use tokenized brand words so both brands are seen
      const m = matchProductName("Coca Cola Classic Can 250ml", candidates);
      expect(m).not.toBeNull();
      expect(m!.productId).toBe("p-coca");
    });
  });
});
