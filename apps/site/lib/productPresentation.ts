import type { Product } from "./types";

export interface ProductPresentation {
  imageSrc: string | null;
  caloriesKcal: number | null;
  fallbackEmoji?: string;
}

/** Fallback emoji for products without images (keyed by product name in all locales) */
const FALLBACK_EMOJI: Record<string, string> = {
  // Russian
  Лёд: "\uD83E\uDDCA",
  Вода: "\uD83D\uDCA7",
  Кола: "\uD83E\uDD64",
  "Сок апельсин": "\uD83C\uDF4A",
  "Шоколадный батончик": "\uD83C\uDF6B",
  Чипсы: "\uD83E\uDD54",
  Круассан: "\uD83E\uDD50",
  Какао: "\uD83C\uDF75",
  "Горячий шоколад": "\uD83C\uDF6B",
  // Uzbek
  Muz: "\uD83E\uDDCA",
  Suv: "\uD83D\uDCA7",
  Kola: "\uD83E\uDD64",
  "Apelsin sharbati": "\uD83C\uDF4A",
  "Shokoladli baton": "\uD83C\uDF6B",
  Chips: "\uD83E\uDD54",
  Kruassan: "\uD83E\uDD50",
  Kakao: "\uD83C\uDF75",
  "Issiq shokolad": "\uD83C\uDF6B",
  // English
  Ice: "\uD83E\uDDCA",
  Water: "\uD83D\uDCA7",
  Cola: "\uD83E\uDD64",
  "Orange juice": "\uD83C\uDF4A",
  "Chocolate bar": "\uD83C\uDF6B",
  Crisps: "\uD83E\uDD54",
  Croissant: "\uD83E\uDD50",
  Cocoa: "\uD83C\uDF75",
  "Hot chocolate": "\uD83C\uDF6B",
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
