"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, FlaskConical, Leaf } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductsTab } from "./_components/products-tab";
import { RecipesTab } from "./_components/recipes-tab";
import { IngredientsTab } from "./_components/ingredients-tab";

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("products");
  const t = useTranslations("products");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            {t("tabProducts")}
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {t("tabRecipes")}
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="gap-2">
            <Leaf className="h-4 w-4" />
            {t("tabIngredients")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="recipes">
          <RecipesTab />
        </TabsContent>

        <TabsContent value="ingredients">
          <IngredientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
