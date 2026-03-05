import type { Product } from "./types";

export interface ProductPresentation {
  imageSrc: string | null;
  caloriesKcal: number | null;
  fallbackEmoji?: string;
}

/** Fallback emoji for products without images (keyed by product name) */
const FALLBACK_EMOJI: Record<string, string> = {
  Лёд: "\uD83E\uDDCA",
  Вода: "\uD83D\uDCA7",
  Кола: "\uD83E\uDD64",
  "Сок апельсин": "\uD83C\uDF4A",
  "Шоколадный батончик": "\uD83C\uDF6B",
  Чипсы: "\uD83E\uDD54",
  Круассан: "\uD83E\uDD50",
  Какао: "\uD83C\uDF75",
  "Горячий шоколад": "\uD83C\uDF6B",
};

export function getProductPresentation(
  product: Pick<Product, "name" | "image_url"> & { calories?: number | null },
): ProductPresentation {
  return {
    imageSrc: product.image_url ?? null,
    caloriesKcal: product.calories ?? null,
    fallbackEmoji: FALLBACK_EMOJI[product.name],
  };
}
