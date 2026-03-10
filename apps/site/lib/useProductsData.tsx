"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { products as fallbackProducts } from "@/lib/data";
import type { Product } from "@/lib/types";

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  isFallback: boolean;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({
  children,
  initialProducts,
}: {
  children: ReactNode;
  initialProducts?: Product[];
}) {
  const [products] = useState<Product[]>(initialProducts ?? fallbackProducts);

  // TODO: Replace with VendHub API fetch when products endpoint is public
  // For now, use static fallback data (Supabase dependency removed)
  return (
    <ProductsContext.Provider
      value={{
        products,
        loading: false,
        isFallback: !initialProducts?.length,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsData() {
  const ctx = useContext(ProductsContext);
  if (!ctx)
    throw new Error("useProductsData must be used within ProductsProvider");
  return ctx;
}
