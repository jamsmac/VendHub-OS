import { createFactory, uuid } from "./base.factory";

interface ProductShape {
  id: string;
  name: string;
  sku: string;
  category: string;
  status: string;
  costPrice: number;
  sellPrice: number;
  currency: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export const productFactory = createFactory<ProductShape>({
  id: () => uuid(),
  name: (i) => `Product ${i}`,
  sku: (i) => `SKU-${String(i).padStart(6, "0")}`,
  category: "beverage",
  status: "active",
  costPrice: (i) => 2000 + i * 100,
  sellPrice: (i) => 5000 + i * 200,
  currency: "UZS",
  organizationId: () => uuid(),
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
});
