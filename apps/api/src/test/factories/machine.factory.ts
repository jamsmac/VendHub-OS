import { createFactory, uuid } from "./base.factory";

interface MachineShape {
  id: string;
  machineNumber: string;
  name: string;
  type: string;
  status: string;
  connectionStatus: string;
  organizationId: string;
  locationId: string | null;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastHeartbeat: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export const machineFactory = createFactory<MachineShape>({
  id: () => uuid(),
  machineNumber: (i) => `VM-${String(i).padStart(4, "0")}`,
  name: (i) => `Coffee Machine ${i}`,
  type: "coffee",
  status: "active",
  connectionStatus: "online",
  organizationId: () => uuid(),
  locationId: null,
  latitude: 41.311081,
  longitude: 69.279737,
  isOnline: true,
  lastHeartbeat: () => new Date(),
  createdAt: () => new Date(),
  updatedAt: () => new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
});
