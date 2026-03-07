import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { RecipeConsumptionService } from "./recipe-consumption.service";
import {
  Recipe,
  RecipeIngredient,
  UnitOfMeasure,
} from "../entities/product.entity";
import { ContainersService } from "../../containers/containers.service";

describe("RecipeConsumptionService", () => {
  let service: RecipeConsumptionService;
  let recipeRepo: any;
  let ingredientRepo: any;
  let containersService: any;
  let dataSource: any;

  const recipeId = "recipe-uuid-1";
  const machineId = "machine-uuid-1";
  const orgId = "org-uuid-1";

  const buildIngredients = () => [
    {
      id: "ri-1",
      recipeId,
      ingredientId: "coffee-beans",
      quantity: 10,
      unitOfMeasure: UnitOfMeasure.GRAM,
      isOptional: false,
    },
    {
      id: "ri-2",
      recipeId,
      ingredientId: "water",
      quantity: 100,
      unitOfMeasure: UnitOfMeasure.MILLILITER,
      isOptional: false,
    },
    {
      id: "ri-3",
      recipeId,
      ingredientId: "sugar",
      quantity: 5,
      unitOfMeasure: UnitOfMeasure.GRAM,
      isOptional: true,
    },
  ];

  const buildContainers = () => [
    {
      id: "c-1",
      nomenclatureId: "coffee-beans",
      currentQuantity: 500,
      capacity: 1000,
      unit: UnitOfMeasure.GRAM,
      slotNumber: 1,
      name: "Coffee Beans",
    },
    {
      id: "c-2",
      nomenclatureId: "water",
      currentQuantity: 2000,
      capacity: 5000,
      unit: UnitOfMeasure.MILLILITER,
      slotNumber: 2,
      name: "Water Tank",
    },
  ];

  beforeEach(async () => {
    recipeRepo = {
      findOne: jest.fn(),
    };

    ingredientRepo = {
      find: jest
        .fn()
        .mockImplementation(() => Promise.resolve(buildIngredients())),
    };

    containersService = {
      findByMachine: jest
        .fn()
        .mockImplementation(() => Promise.resolve(buildContainers())),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => {
        const manager = {
          save: jest.fn().mockResolvedValue({}),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeConsumptionService,
        { provide: getRepositoryToken(Recipe), useValue: recipeRepo },
        {
          provide: getRepositoryToken(RecipeIngredient),
          useValue: ingredientRepo,
        },
        { provide: ContainersService, useValue: containersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RecipeConsumptionService>(RecipeConsumptionService);
  });

  // --------------------------------------------------------------------------
  // calculateConsumption
  // --------------------------------------------------------------------------

  it("should calculate consumption for 1 portion excluding optional ingredients", async () => {
    const result = await service.calculateConsumption(recipeId, 1);

    expect(result).toHaveLength(2); // sugar is optional, excluded
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: "coffee-beans",
          quantity: 10,
        }),
        expect.objectContaining({
          ingredientId: "water",
          quantity: 100,
        }),
      ]),
    );
  });

  it("should scale consumption by portion count", async () => {
    const result = await service.calculateConsumption(recipeId, 3);

    const coffee = result.find((r) => r.ingredientId === "coffee-beans");
    expect(coffee!.quantity).toBe(30); // 10 * 3
  });

  it("should throw NotFoundException when recipe has no ingredients", async () => {
    ingredientRepo.find.mockResolvedValue([]);

    await expect(
      service.calculateConsumption("empty-recipe", 1),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // checkAvailability
  // --------------------------------------------------------------------------

  it("should report available when containers have enough stock", async () => {
    const result = await service.checkAvailability(
      recipeId,
      machineId,
      orgId,
      1,
    );

    expect(result.available).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("should report missing ingredients when stock is insufficient", async () => {
    const containers = buildContainers();
    containersService.findByMachine.mockResolvedValue([
      { ...containers[0], currentQuantity: 5 }, // only 5g coffee
      containers[1],
    ]);

    const result = await service.checkAvailability(
      recipeId,
      machineId,
      orgId,
      2, // needs 20g coffee
    );

    expect(result.available).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ingredientId: "coffee-beans" }),
      ]),
    );
  });

  // --------------------------------------------------------------------------
  // deductIngredients
  // --------------------------------------------------------------------------

  it("should deduct ingredients from containers", async () => {
    const result = await service.deductIngredients(
      recipeId,
      machineId,
      orgId,
      1,
    );

    expect(result.deducted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ containerId: "c-1" }),
        expect.objectContaining({ containerId: "c-2" }),
      ]),
    );
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it("should throw when ingredients are insufficient for deduction", async () => {
    const containers = buildContainers();
    containersService.findByMachine.mockResolvedValue([
      { ...containers[0], currentQuantity: 0 },
      containers[1],
    ]);

    await expect(
      service.deductIngredients(recipeId, machineId, orgId, 1),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // estimateAvailablePortions
  // --------------------------------------------------------------------------

  it("should estimate available portions based on container stock", async () => {
    // 500g coffee / 10g per portion = 50
    // 2000ml water / 100ml per portion = 20
    // min(50, 20) = 20
    const result = await service.estimateAvailablePortions(
      recipeId,
      machineId,
      orgId,
    );

    expect(result).toBe(20);
  });

  it("should return 0 when no containers match ingredients", async () => {
    containersService.findByMachine.mockResolvedValue([]);

    const result = await service.estimateAvailablePortions(
      recipeId,
      machineId,
      orgId,
    );

    expect(result).toBe(0);
  });

  // --------------------------------------------------------------------------
  // getRefillRequirements
  // --------------------------------------------------------------------------

  it("should return refill requirements grouped by nomenclature", async () => {
    const containers = buildContainers();
    containersService.findByMachine.mockResolvedValue([
      {
        ...containers[0],
        currentQuantity: 200,
        capacity: 1000,
      },
    ]);

    const result = await service.getRefillRequirements(machineId, orgId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        nomenclatureId: "coffee-beans",
        totalDeficit: 800,
      }),
    );
  });

  it("should skip nomenclatures with no deficit", async () => {
    const containers = buildContainers();
    containersService.findByMachine.mockResolvedValue([
      {
        ...containers[0],
        currentQuantity: 1000,
        capacity: 1000,
      },
    ]);

    const result = await service.getRefillRequirements(machineId, orgId);
    expect(result).toHaveLength(0);
  });
});
