import { createFactory, uuid } from "./base.factory";

interface OrganizationShape {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  inn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  parentId: string | null;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export const organizationFactory = createFactory<OrganizationShape>({
  id: () => uuid(),
  name: (i) => `Organization ${i}`,
  slug: (i) => `org-${i}`,
  type: "franchise",
  status: "active",
  inn: (i) => `${300000000 + i}`,
  phone: (i) => `+99871${String(i).padStart(7, "0")}`,
  email: (i) => `org${i}@vendhub-test.uz`,
  address: "Tashkent, Uzbekistan",
  parentId: null,
  subscriptionTier: "standard",
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
});
