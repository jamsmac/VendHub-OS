/**
 * RecipeConsumptionService
 * Bridges recipes ↔ machine containers: deducts ingredients after sales,
 * checks availability, estimates portions, and reports refill needs.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Recipe,
  RecipeIngredient,
  UnitOfMeasure,
} from "../entities/product.entity";
import { ContainersService } from "../../containers/containers.service";
import { Container } from "../../containers/entities/container.entity";

// ============================================================================
// UNIT CONVERSION (shared logic with products.service.ts)
// ============================================================================

const UNIT_CONVERSION: Record<string, Record<string, number>> = {
  [UnitOfMeasure.GRAM]: { [UnitOfMeasure.KILOGRAM]: 0.001 },
  [UnitOfMeasure.KILOGRAM]: { [UnitOfMeasure.GRAM]: 1000 },
  [UnitOfMeasure.MILLILITER]: { [UnitOfMeasure.LITER]: 0.001 },
  [UnitOfMeasure.LITER]: { [UnitOfMeasure.MILLILITER]: 1000 },
};

function convertUnits(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return quantity;
  const factor = UNIT_CONVERSION[fromUnit]?.[toUnit];
  return factor ? quantity * factor : quantity;
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ConsumptionItem {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface AvailabilityResult {
  available: boolean;
  missing: {
    ingredientId: string;
    required: number;
    available: number;
    unit: string;
  }[];
}

export interface RefillItem {
  nomenclatureId: string;
  nomenclatureName: string | null;
  containers: {
    containerId: string;
    slotNumber: number;
    name: string | null;
    currentQuantity: number;
    capacity: number;
    deficit: number;
    unit: string;
  }[];
  totalDeficit: number;
  unit: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class RecipeConsumptionService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,

    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,

    private readonly containersService: ContainersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calculate the ingredient consumption for N portions of a recipe.
   */
  async calculateConsumption(
    recipeId: string,
    portions = 1,
  ): Promise<ConsumptionItem[]> {
    const ingredients = await this.recipeIngredientRepository.find({
      where: { recipeId },
    });

    if (ingredients.length === 0) {
      throw new NotFoundException(
        `No ingredients found for recipe ${recipeId}`,
      );
    }

    return ingredients
      .filter((ri) => !ri.isOptional)
      .map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: Number(ri.quantity) * portions,
        unit: ri.unitOfMeasure,
      }));
  }

  /**
   * Check whether a machine has enough ingredient stock
   * in its containers to produce N portions of a recipe.
   */
  async checkAvailability(
    recipeId: string,
    machineId: string,
    organizationId: string,
    portions = 1,
  ): Promise<AvailabilityResult> {
    const consumption = await this.calculateConsumption(recipeId, portions);
    const containers = await this.containersService.findByMachine(
      machineId,
      organizationId,
    );

    const missing: AvailabilityResult["missing"] = [];

    for (const item of consumption) {
      const matched = containers.filter(
        (c) => c.nomenclatureId === item.ingredientId,
      );
      const totalAvailable = this.sumContainerQuantity(matched, item.unit);

      if (totalAvailable < item.quantity) {
        missing.push({
          ingredientId: item.ingredientId,
          required: item.quantity,
          available: totalAvailable,
          unit: item.unit,
        });
      }
    }

    return { available: missing.length === 0, missing };
  }

  /**
   * Deduct ingredient quantities from machine containers after a sale.
   * Runs inside a transaction so all-or-nothing.
   */
  async deductIngredients(
    recipeId: string,
    machineId: string,
    organizationId: string,
    portions = 1,
    _userId?: string,
  ): Promise<{ deducted: { containerId: string; quantity: number }[] }> {
    const consumption = await this.calculateConsumption(recipeId, portions);

    // Pre-check availability
    const availability = await this.checkAvailability(
      recipeId,
      machineId,
      organizationId,
      portions,
    );
    if (!availability.available) {
      throw new BadRequestException(
        `Insufficient ingredients for ${portions} portion(s): ${availability.missing.map((m) => m.ingredientId).join(", ")}`,
      );
    }

    const containers = await this.containersService.findByMachine(
      machineId,
      organizationId,
    );

    const deducted: { containerId: string; quantity: number }[] = [];

    // Use a transaction for atomicity
    await this.dataSource.transaction(async (manager) => {
      for (const item of consumption) {
        let remaining = item.quantity;
        const matched = containers
          .filter((c) => c.nomenclatureId === item.ingredientId)
          .sort(
            (a, b) => Number(a.currentQuantity) - Number(b.currentQuantity),
          ); // drain smaller containers first

        for (const container of matched) {
          if (remaining <= 0) break;

          const availableInUnit = convertUnits(
            Number(container.currentQuantity),
            container.unit,
            item.unit,
          );
          const toDeductInRecipeUnit = Math.min(availableInUnit, remaining);
          const toDeductInContainerUnit = convertUnits(
            toDeductInRecipeUnit,
            item.unit,
            container.unit,
          );

          container.currentQuantity =
            Number(container.currentQuantity) - toDeductInContainerUnit;
          if (container.currentQuantity < 0) container.currentQuantity = 0;

          await manager.save(Container, container);
          deducted.push({
            containerId: container.id,
            quantity: toDeductInContainerUnit,
          });
          remaining -= toDeductInRecipeUnit;
        }
      }
    });

    return { deducted };
  }

  /**
   * Estimate how many portions of a recipe can be produced
   * from the current container levels on a machine.
   */
  async estimateAvailablePortions(
    recipeId: string,
    machineId: string,
    organizationId: string,
  ): Promise<number> {
    const consumption = await this.calculateConsumption(recipeId, 1);
    const containers = await this.containersService.findByMachine(
      machineId,
      organizationId,
    );

    let minPortions = Infinity;

    for (const item of consumption) {
      if (item.quantity <= 0) continue;

      const matched = containers.filter(
        (c) => c.nomenclatureId === item.ingredientId,
      );
      const totalAvailable = this.sumContainerQuantity(matched, item.unit);
      const portions = Math.floor(totalAvailable / item.quantity);
      minPortions = Math.min(minPortions, portions);
    }

    return minPortions === Infinity ? 0 : minPortions;
  }

  /**
   * Get refill requirements for all containers on a machine,
   * grouped by nomenclature (ingredient product).
   */
  async getRefillRequirements(
    machineId: string,
    organizationId: string,
  ): Promise<RefillItem[]> {
    const containers = await this.containersService.findByMachine(
      machineId,
      organizationId,
    );

    const byNomenclature = new Map<string, typeof containers>();
    for (const c of containers) {
      if (!c.nomenclatureId) continue;
      const list = byNomenclature.get(c.nomenclatureId) || [];
      list.push(c);
      byNomenclature.set(c.nomenclatureId, list);
    }

    const result: RefillItem[] = [];
    for (const [nomenclatureId, group] of byNomenclature) {
      const items = group.map((c) => ({
        containerId: c.id,
        slotNumber: c.slotNumber,
        name: c.name,
        currentQuantity: Number(c.currentQuantity),
        capacity: Number(c.capacity),
        deficit: Math.max(0, Number(c.capacity) - Number(c.currentQuantity)),
        unit: c.unit,
      }));

      const totalDeficit = items.reduce((sum, i) => sum + i.deficit, 0);
      if (totalDeficit <= 0) continue;

      result.push({
        nomenclatureId,
        nomenclatureName: group[0]!.name,
        containers: items,
        totalDeficit,
        unit: group[0]!.unit,
      });
    }

    return result;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private sumContainerQuantity(
    containers: Container[],
    targetUnit: string,
  ): number {
    return containers.reduce((sum, c) => {
      return sum + convertUnits(Number(c.currentQuantity), c.unit, targetUnit);
    }, 0);
  }
}
