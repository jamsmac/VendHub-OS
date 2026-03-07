/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ImportValidatorService } from "./import-validator.service";
import { ImportType } from "../entities/import.entity";
import {
  ValidationRule,
  ValidationRuleType,
} from "../entities/validation-rule.entity";
import { DomainType } from "../entities/import-session.entity";

describe("ImportValidatorService", () => {
  let service: ImportValidatorService;
  let validationRuleRepo: any;

  beforeEach(async () => {
    validationRuleRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportValidatorService,
        {
          provide: getRepositoryToken(ValidationRule),
          useValue: validationRuleRepo,
        },
      ],
    }).compile();

    service = module.get<ImportValidatorService>(ImportValidatorService);
  });

  // --------------------------------------------------------------------------
  // getValidator
  // --------------------------------------------------------------------------

  it("should return a validator function for PRODUCTS import type", () => {
    const validator = service.getValidator(ImportType.PRODUCTS);
    expect(typeof validator).toBe("function");
  });

  it("should return generic validator for unknown import type", () => {
    const validator = service.getValidator("unknown_type" as ImportType);
    expect(typeof validator).toBe("function");
  });

  // --------------------------------------------------------------------------
  // Product domain validation
  // --------------------------------------------------------------------------

  it("should validate product with missing name", async () => {
    const validator = service.getValidator(ImportType.PRODUCTS);
    const result = await validator({ price: "100" }, "org-1", 1);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name", message: expect.any(String) }),
      ]),
    );
  });

  it("should warn when product category is missing", async () => {
    const validator = service.getValidator(ImportType.PRODUCTS);
    const result = await validator({ name: "Cola", price: "100" }, "org-1", 1);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "category" })]),
    );
  });

  it("should reject invalid price in product", async () => {
    const validator = service.getValidator(ImportType.PRODUCTS);
    const result = await validator(
      { name: "Cola", price: "abc", category: "drinks" },
      "org-1",
      1,
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "price" })]),
    );
  });

  // --------------------------------------------------------------------------
  // applyMapping
  // --------------------------------------------------------------------------

  it("should apply column mapping correctly", () => {
    const data = { col_a: "value1", col_b: "value2", col_c: "value3" };
    const mapping = { col_a: "name", col_b: "price" };

    const result = service.applyMapping(data, mapping);

    expect(result.name).toBe("value1");
    expect(result.price).toBe("value2");
    expect(result.col_c).toBe("value3"); // unmapped field preserved
  });

  it("should skip undefined source fields during mapping", () => {
    const data = { col_a: "value1" };
    const mapping = { col_a: "name", col_b: "price" };

    const result = service.applyMapping(data, mapping);

    expect(result.name).toBe("value1");
    expect(result.price).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // isValidEmail
  // --------------------------------------------------------------------------

  it("should validate correct email format", () => {
    expect(service.isValidEmail("user@example.com")).toBe(true);
    expect(service.isValidEmail("invalid-email")).toBe(false);
    expect(service.isValidEmail("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Validation Rule Engine
  // --------------------------------------------------------------------------

  it("should apply REQUIRED rule and fail on empty value", () => {
    const rule = {
      ruleType: ValidationRuleType.REQUIRED,
      fieldName: "name",
      ruleDefinition: {},
      errorMessageTemplate: null,
    } as unknown as ValidationRule;

    const result = service.applyValidationRule(rule, "", {}, 1);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("required");
  });

  it("should apply RANGE rule and detect out-of-range value", () => {
    const rule = {
      ruleType: ValidationRuleType.RANGE,
      fieldName: "price",
      ruleDefinition: { min: 0, max: 1000 },
      errorMessageTemplate: null,
    } as unknown as ValidationRule;

    const result = service.applyValidationRule(rule, 1500, {}, 1);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("at most");
  });

  it("should apply ENUM rule and reject invalid enum value", () => {
    const rule = {
      ruleType: ValidationRuleType.ENUM,
      fieldName: "status",
      ruleDefinition: { values: ["active", "inactive"] },
      errorMessageTemplate: null,
    } as unknown as ValidationRule;

    const result = service.applyValidationRule(rule, "deleted", {}, 1);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("must be one of");
  });

  it("should apply FORMAT rule for email validation", () => {
    const rule = {
      ruleType: ValidationRuleType.FORMAT,
      fieldName: "email",
      ruleDefinition: { format: "email" },
      errorMessageTemplate: null,
    } as unknown as ValidationRule;

    const validResult = service.applyValidationRule(
      rule,
      "test@example.com",
      {},
      1,
    );
    expect(validResult.valid).toBe(true);

    const invalidResult = service.applyValidationRule(
      rule,
      "not-an-email",
      {},
      1,
    );
    expect(invalidResult.valid).toBe(false);
  });

  it("should apply CROSS_FIELD rule with required_if condition", () => {
    const rule = {
      ruleType: ValidationRuleType.CROSS_FIELD,
      fieldName: "phone",
      ruleDefinition: {
        condition: "required_if",
        dependent_field: "contactType",
      },
      errorMessageTemplate: null,
    } as unknown as ValidationRule;

    const result = service.applyValidationRule(
      rule,
      "",
      { contactType: "phone" },
      1,
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("required when");
  });

  it("should fetch validation rules for a domain", async () => {
    const mockRules = [
      { id: "1", domain: DomainType.PRODUCTS, isActive: true, priority: 1 },
    ];
    validationRuleRepo.find.mockResolvedValue(mockRules);

    const rules = await service.getValidationRulesForDomain(
      DomainType.PRODUCTS,
    );
    expect(rules).toEqual(mockRules);
    expect(validationRuleRepo.find).toHaveBeenCalledWith({
      where: { domain: DomainType.PRODUCTS, isActive: true },
      order: { priority: "ASC" },
    });
  });
});
