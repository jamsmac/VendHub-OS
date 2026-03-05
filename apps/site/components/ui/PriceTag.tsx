import { formatPrice } from "@/lib/utils";

interface PriceTagProps {
  price: number;
  oldPrice?: number;
  currency?: string;
  className?: string;
}

export default function PriceTag({
  price,
  oldPrice,
  currency = "UZS",
  className = "",
}: PriceTagProps) {
  return (
    <span
      className={["price-tag inline-flex items-center gap-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      {oldPrice && (
        <span className="text-sm text-chocolate/40 line-through font-normal">
          {formatPrice(oldPrice)} {currency}
        </span>
      )}
      <span>
        {formatPrice(price)} {currency}
      </span>
    </span>
  );
}
