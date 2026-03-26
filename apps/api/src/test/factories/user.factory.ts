import { createFactory, uuid } from "./base.factory";

interface UserShape {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: string;
  organizationId: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export const userFactory = createFactory<UserShape>({
  id: () => uuid(),
  email: (i) => `user${i}@vendhub-test.uz`,
  username: (i) => `user_${i}`,
  firstName: (i) => `Test${i}`,
  lastName: "User",
  phone: (i) => `+99890${String(i).padStart(7, "0")}`,
  role: "operator",
  status: "active",
  organizationId: () => uuid(),
  isActive: true,
  twoFactorEnabled: false,
  loginAttempts: 0,
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
});

export const adminUserFactory = createFactory<UserShape>({
  ...userFactory.build(),
  id: () => uuid(),
  email: (i) => `admin${i}@vendhub-test.uz`,
  username: (i) => `admin_${i}`,
  role: "admin",
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
});
