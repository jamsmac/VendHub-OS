/**
 * Product page shared types
 * Used across ProductsTab, RecipesTab, and IngredientsTab
 */

export interface Product {
  id: string;
  name: string;
  nameUz?: string;
  sku: string;
  category: string;
  price: number;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  status: "active" | "low_stock" | "out_of_stock";
  isIngredient: boolean;
  unitOfMeasure: string;
  imageUrl?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
}

export interface Recipe {
  id: string;
  name: string;
  nameUz?: string;
  typeCode: string;
  isActive: boolean;
  preparationTimeSeconds?: number;
  temperatureCelsius?: number;
  servingSizeMl?: number;
  totalCost: number;
  product?: { id: string; name: string; imageUrl?: string };
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unitOfMeasure: string;
  sortOrder: number;
  isOptional: boolean;
  ingredient?: { id: string; name: string; sku: string };
}

export const statusColors: Record<string, { color: string; bgColor: string }> =
  {
    active: { color: "text-green-600", bgColor: "bg-green-100" },
    low_stock: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
    out_of_stock: { color: "text-red-600", bgColor: "bg-red-100" },
  };

export const recipeTypeColors: Record<string, string> = {
  primary: "bg-blue-100 text-blue-600",
  alternative: "bg-purple-100 text-purple-600",
  promotional: "bg-orange-100 text-orange-600",
  test: "bg-gray-100 text-gray-600",
};
