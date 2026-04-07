import { randomUUID } from "crypto";

/**
 * Base factory for generating test entities.
 *
 * Usage:
 *   const userFactory = createFactory<User>({
 *     id: () => randomUUID(),
 *     email: (i) => `user${i}@test.com`,
 *     firstName: 'John',
 *     organizationId: () => randomUUID(),
 *   });
 *
 *   const user = userFactory.build();
 *   const users = userFactory.buildMany(5);
 *   const admin = userFactory.build({ role: 'admin' });
 */

type FactoryField<T> = T | ((index: number) => T);

type FactoryDefinition<T> = {
  [K in keyof T]: FactoryField<T[K]>;
};

export interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  buildCreateDto(
    overrides?: Partial<T>,
  ): Omit<T, "id" | "createdAt" | "updatedAt" | "deletedAt">;
}

let globalCounter = 0;

function resolveField<T>(field: FactoryField<T>, index: number): T {
  if (typeof field === "function") {
    return (field as (index: number) => T)(index);
  }
  return field;
}

export function createFactory<T extends object>(
  definition: FactoryDefinition<T>,
): Factory<T> {
  return {
    build(overrides?: Partial<T>): T {
      const index = ++globalCounter;
      const result = {} as Record<string, unknown>;

      for (const [key, fieldDef] of Object.entries(definition)) {
        result[key] = resolveField(fieldDef, index);
      }

      if (overrides) {
        Object.assign(result, overrides);
      }

      return result as T;
    },

    buildMany(count: number, overrides?: Partial<T>): T[] {
      return Array.from({ length: count }, () => this.build(overrides));
    },

    buildCreateDto(overrides?: Partial<T>) {
      const entity = this.build(overrides);
      const { id, createdAt, updatedAt, deletedAt, ...dto } = entity as Record<
        string,
        unknown
      >;
      return dto as Omit<T, "id" | "createdAt" | "updatedAt" | "deletedAt">;
    },
  };
}

/** Generate a random UUID */
export const uuid = randomUUID;

/** Generate a unique sequence number */
export function seq(): number {
  return ++globalCounter;
}

/** Reset the global counter (call in beforeEach) */
export function resetFactoryCounter(): void {
  globalCounter = 0;
}
