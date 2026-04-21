import { KNOWN_BRANDS } from "../constants/known-brands";

const UNIT_WORDS =
  /\b(ml|мл|l|л|ltr|g|гр|kg|кг|can|can's|bottle|банка|бутылка|шт|pcs|pack|пачка)\b/gi;

/**
 * Normalize a raw product name for matching.
 * Strips BOM, tabs, units, punctuation; lowercases; collapses whitespace.
 */
export function normalizeProductName(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/\ufeff/g, ""); // Strip BOM
  s = s.replace(/\t/g, " ");
  s = s.replace(UNIT_WORDS, " ");
  s = s.replace(/[^a-zа-яё0-9 ]+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function extractBrands(normalized: string): Set<string> {
  const words = normalized.split(/\s+/);
  return new Set(words.filter((w) => KNOWN_BRANDS.includes(w)));
}

/**
 * Jaccard similarity with brand bonus.
 * Returns score in [0, 1.15]. Threshold: >= 0.4 → matched.
 */
export function similarityScore(a: string, b: string): number {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = union.size === 0 ? 0 : intersection.size / union.size;

  const brandsA = extractBrands(na);
  const brandsB = extractBrands(nb);

  let score = jaccard;
  if (brandsA.size > 0 && brandsB.size > 0) {
    const brandsIntersect = new Set(
      [...brandsA].filter((br) => brandsB.has(br)),
    );
    const brandRatio =
      brandsIntersect.size / Math.max(brandsA.size, brandsB.size);
    if (brandRatio > 0) {
      // Blend: 50% jaccard + 50% brand overlap
      score = jaccard * 0.5 + brandRatio * 0.5;
    } else {
      // Brand mismatch penalty — different brands, unlikely to be same product
      score *= 0.2;
    }
  }

  // Substring bonus: one contained in the other
  if (na.includes(nb) || nb.includes(na)) score += 0.15;

  return score;
}

export interface MatchCandidate {
  productId: string;
  name: string;
}

export function matchProductName(
  csvName: string,
  candidates: MatchCandidate[],
  threshold = 0.4,
): { productId: string; score: number } | null {
  let best: { productId: string; score: number } | null = null;
  for (const c of candidates) {
    const score = similarityScore(csvName, c.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { productId: c.productId, score };
    }
  }
  return best;
}
