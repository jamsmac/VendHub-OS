"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { products as fallbackProducts } from "@/lib/data";
import { supabase } from "@/lib/supabase";
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
  const [products, setProducts] = useState<Product[]>(
    initialProducts ?? fallbackProducts,
  );
  const [loading, setLoading] = useState(!initialProducts?.length);
  const [isFallback, setIsFallback] = useState(!initialProducts?.length);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!active) return;

      if (error || !data) {
        console.error("Products fetch failed:", error?.message);
        setIsFallback(true);
      } else {
        setProducts(data as Product[]);
        setIsFallback(false);
      }

      setLoading(false);
    };

    // Skip initial fetch if server-provided data exists
    if (!initialProducts?.length) {
      fetchProducts();
    }

    // Realtime subscription for live admin updates
    const channel = supabase
      .channel("products-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        },
      )
      .subscribe((status, err) => {
        if (err) console.error("Products subscription error:", err);
      });

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, []);

  return (
    <ProductsContext.Provider value={{ products, loading, isFallback }}>
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
