import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Heart,
  Plus,
  Minus,
  ShoppingCart,
  Flame,
  Droplets,
  Coffee,
  Milk,
} from "lucide-react";
import { toast } from "sonner";
import { productsApi, recipesApi } from "../lib/api";
import { useCartStore } from "../lib/store";

interface RecipeIngredient {
  ingredientName?: string;
  name?: string;
  quantity: number;
  unitOfMeasure: string;
}

export function DrinkDetailPage() {
  const { t } = useTranslation();
  const { productId } = useParams<{
    machineId: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addItem);

  const [quantity, setQuantity] = useState(1);
  const [sugar, setSugar] = useState("medium");
  const [volume, setVolume] = useState("medium");
  const [milk, setMilk] = useState("regular");
  const [isFavorite, setIsFavorite] = useState(false);

  const SUGAR_LEVELS = [
    { key: "none", label: t("drinkSugarNone"), icon: "\uD83D\uDEAB" },
    { key: "low", label: t("drinkSugarLow"), icon: "\uD83C\uDF6C" },
    {
      key: "medium",
      label: t("drinkSugarMedium"),
      icon: "\uD83C\uDF6C\uD83C\uDF6C",
    },
    {
      key: "high",
      label: t("drinkSugarHigh"),
      icon: "\uD83C\uDF6C\uD83C\uDF6C\uD83C\uDF6C",
    },
  ];

  const VOLUME_OPTIONS = [
    { key: "small", label: "200 ml", price: 0 },
    { key: "medium", label: "300 ml", price: 3000 },
    { key: "large", label: "400 ml", price: 5000 },
  ];

  const MILK_OPTIONS = [
    { key: "regular", label: t("drinkMilkRegular"), icon: "\uD83E\uDD5B" },
    { key: "oat", label: t("drinkMilkOat"), icon: "\uD83C\uDF3E", extra: 2000 },
    {
      key: "coconut",
      label: t("drinkMilkCoconut"),
      icon: "\uD83E\uDD65",
      extra: 3000,
    },
    { key: "none", label: t("drinkMilkNone"), icon: "\u274C" },
  ];

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await productsApi.getAll({ id: productId });
      const data = res.data;
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!productId,
  });

  // Fetch recipe
  const { data: recipes } = useQuery({
    queryKey: ["recipes", productId],
    queryFn: () => recipesApi.getByProduct(productId!).then((r) => r.data),
    enabled: !!productId,
  });

  const recipe = Array.isArray(recipes) ? recipes[0] : null;

  const volumeExtra = VOLUME_OPTIONS.find((v) => v.key === volume)?.price || 0;
  const milkExtra = MILK_OPTIONS.find((m) => m.key === milk)?.extra || 0;
  const basePrice = product?.price || 0;
  const totalPrice = (basePrice + volumeExtra + milkExtra) * quantity;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      price: basePrice + volumeExtra + milkExtra,
    });
    toast.success(t("addedToCartToast"));
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-64 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Hero */}
      <div className="relative h-64 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 p-2 bg-white/80 rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-12 right-4 p-2 bg-white/80 rounded-full backdrop-blur-sm"
        >
          <Heart
            className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`}
          />
        </button>
        <span className="text-8xl">{product?.imageUrl || "\u2615"}</span>
      </div>

      <div className="px-4 -mt-4 space-y-5">
        {/* Title */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <h1 className="text-xl font-bold">{product?.name}</h1>
          {product?.description && (
            <p className="text-sm text-gray-500 mt-1">{product.description}</p>
          )}
          <p className="text-xl font-bold text-primary-600 mt-2">
            {basePrice.toLocaleString()} {t("currency")}
          </p>
        </div>

        {/* Recipe Info */}
        {recipe && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-600" />
              {t("drinkComposition")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {recipe.ingredients?.map((ing: RecipeIngredient, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white rounded-lg text-xs border"
                >
                  {ing.ingredientName || ing.name} — {ing.quantity}
                  {ing.unitOfMeasure}
                </span>
              )) || (
                <p className="text-xs text-amber-700">
                  {t("drinkPrepTime", {
                    seconds: recipe.preparationTimeSeconds,
                    ml: recipe.servingSizeMl,
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Volume */}
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            {t("drinkVolume")}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {VOLUME_OPTIONS.map((v) => (
              <button
                key={v.key}
                onClick={() => setVolume(v.key)}
                className={`py-3 rounded-xl text-sm font-medium border transition ${
                  volume === v.key
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <div>{v.label}</div>
                {v.price > 0 && (
                  <div className="text-xs opacity-75">
                    +{v.price.toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sugar */}
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t("drinkSugar")}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {SUGAR_LEVELS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSugar(s.key)}
                className={`py-2.5 rounded-xl text-center border transition ${
                  sugar === s.key
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <div className="text-lg">{s.icon}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Milk */}
        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Milk className="h-4 w-4 text-gray-500" />
            {t("drinkMilk")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {MILK_OPTIONS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMilk(m.key)}
                className={`py-3 rounded-xl text-sm border transition flex items-center justify-center gap-2 ${
                  milk === m.key
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
                {m.extra && (
                  <span className="text-xs opacity-75">
                    +{m.extra.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-4 safe-area-bottom">
        <div className="flex items-center gap-4">
          {/* Quantity */}
          <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-bold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className="p-1"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalPrice.toLocaleString()} {t("currency")}
          </button>
        </div>
      </div>
    </div>
  );
}
