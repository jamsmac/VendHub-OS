import { createFactory, uuid } from "./base.factory";

interface TransactionShape {
  id: string;
  machineId: string;
  productId: string | null;
  organizationId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string | null;
  status: string;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export const transactionFactory = createFactory<TransactionShape>({
  id: () => uuid(),
  machineId: () => uuid(),
  productId: () => uuid(),
  organizationId: () => uuid(),
  amount: (i) => 5000 + i * 1000,
  currency: "UZS",
  paymentMethod: "card",
  paymentProvider: "payme",
  status: "completed",
  externalId: (i) => `ext-${uuid().slice(0, 8)}-${i}`,
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
});
