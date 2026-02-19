/**
 * Import Validator Service
 * Domain-specific validators and validation rule engine
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ImportType } from "../entities/import.entity";
import {
  ValidationRule,
  ValidationRuleType,
} from "../entities/validation-rule.entity";
import { DomainType } from "../entities/import-session.entity";

@Injectable()
export class ImportValidatorService {
  constructor(
    @InjectRepository(ValidationRule)
    private readonly validationRuleRepo: Repository<ValidationRule>,
  ) {}

  // ========================================================================
  // DOMAIN VALIDATORS (legacy import job validation)
  // ========================================================================

  /**
   * Get validator for import type
   */
  getValidator(importType: ImportType): (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    orgId: string,
    row: number,
  ) => Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validators: Record<ImportType, any> = {
      [ImportType.PRODUCTS]: this.validateProduct.bind(this),
      [ImportType.MACHINES]: this.validateMachine.bind(this),
      [ImportType.USERS]: this.validateUser.bind(this),
      [ImportType.EMPLOYEES]: this.validateEmployee.bind(this),
      [ImportType.TRANSACTIONS]: this.validateTransaction.bind(this),
      [ImportType.SALES]: this.validateSale.bind(this),
      [ImportType.INVENTORY]: this.validateInventory.bind(this),
      [ImportType.CUSTOMERS]: this.validateCustomer.bind(this),
      [ImportType.PRICES]: this.validatePrice.bind(this),
      [ImportType.CATEGORIES]: this.validateCategory.bind(this),
      [ImportType.LOCATIONS]: this.validateLocation.bind(this),
      [ImportType.CONTRACTORS]: this.validateContractor.bind(this),
    };

    return validators[importType] || this.validateGeneric.bind(this);
  }

  /**
   * Apply mapping to row data
   */
  applyMapping(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    mapping: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        result[targetField] = data[sourceField];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(data)) {
      if (!mapping[key]) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ========================================================================
  // VALIDATION RULE ENGINE (session-based validation)
  // ========================================================================

  /**
   * Get validation rules for a domain, sorted by priority.
   */
  async getValidationRulesForDomain(
    domain: DomainType,
  ): Promise<ValidationRule[]> {
    return this.validationRuleRepo.find({
      where: { domain, is_active: true },
      order: { priority: "ASC" },
    });
  }

  /**
   * Get validation rules, optionally filtered by domain.
   */
  async getValidationRules(domain?: DomainType): Promise<ValidationRule[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { is_active: true };
    if (domain) {
      where.domain = domain;
    }

    return this.validationRuleRepo.find({
      where,
      order: { domain: "ASC", priority: "ASC" },
    });
  }

  /**
   * Apply a single validation rule to a field value.
   */
  applyValidationRule(
    rule: ValidationRule,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: Record<string, any>,
    rowNumber: number,
  ): { valid: boolean; message: string } {
    const def = rule.rule_definition;

    const formatMessage = (
      template: string | null,
      defaultMsg: string,
    ): string => {
      if (!template) return defaultMsg;
      return template
        .replace(/\{\{field\}\}/g, rule.field_name)
        .replace(/\{\{value\}\}/g, String(value ?? ""))
        .replace(/\{\{row\}\}/g, String(rowNumber));
    };

    switch (rule.rule_type) {
      case ValidationRuleType.REQUIRED: {
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" is required`,
            ),
          };
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.RANGE: {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be a number`,
            ),
          };
        }
        if (def.min !== undefined && numValue < def.min) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be at least ${def.min}`,
            ),
          };
        }
        if (def.max !== undefined && numValue > def.max) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be at most ${def.max}`,
            ),
          };
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.REGEX: {
        if (value === undefined || value === null) {
          return { valid: true, message: "" };
        }
        const regex = new RegExp(def.pattern);
        if (!regex.test(String(value))) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" does not match required pattern`,
            ),
          };
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.ENUM: {
        if (value === undefined || value === null) {
          return { valid: true, message: "" };
        }
        const allowedValues: string[] = def.values || [];
        if (!allowedValues.includes(String(value))) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be one of: ${allowedValues.join(", ")}`,
            ),
          };
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.LENGTH: {
        if (value === undefined || value === null) {
          return { valid: true, message: "" };
        }
        const strValue = String(value);
        if (def.min_length !== undefined && strValue.length < def.min_length) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be at least ${def.min_length} characters`,
            ),
          };
        }
        if (def.max_length !== undefined && strValue.length > def.max_length) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be at most ${def.max_length} characters`,
            ),
          };
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.FORMAT: {
        if (value === undefined || value === null) {
          return { valid: true, message: "" };
        }
        if (def.format === "email") {
          if (!this.isValidEmail(String(value))) {
            return {
              valid: false,
              message: formatMessage(
                rule.error_message_template,
                `Field "${rule.field_name}" is not a valid email`,
              ),
            };
          }
        }
        if (def.format === "uuid") {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(String(value))) {
            return {
              valid: false,
              message: formatMessage(
                rule.error_message_template,
                `Field "${rule.field_name}" is not a valid UUID`,
              ),
            };
          }
        }
        if (def.format === "date") {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            return {
              valid: false,
              message: formatMessage(
                rule.error_message_template,
                `Field "${rule.field_name}" is not a valid date`,
              ),
            };
          }
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.UNIQUE: {
        // Unique validation would require checking the entire dataset or DB.
        // This is a placeholder -- full unique checks happen during execution.
        return { valid: true, message: "" };
      }

      case ValidationRuleType.FOREIGN_KEY: {
        // FK validation would require DB lookup.
        // This is a placeholder -- full FK checks happen during execution.
        return { valid: true, message: "" };
      }

      case ValidationRuleType.CROSS_FIELD: {
        // Cross-field validation using dependent_field and condition from rule_definition
        if (def.condition === "required_if" && def.dependent_field) {
          const dependentValue = row[def.dependent_field];
          if (
            dependentValue &&
            (value === undefined ||
              value === null ||
              String(value).trim() === "")
          ) {
            return {
              valid: false,
              message: formatMessage(
                rule.error_message_template,
                `Field "${rule.field_name}" is required when "${def.dependent_field}" is set`,
              ),
            };
          }
        }
        return { valid: true, message: "" };
      }

      case ValidationRuleType.CUSTOM: {
        // Custom rules would execute a stored expression or function.
        // Placeholder for future implementation.
        return { valid: true, message: "" };
      }

      default:
        return { valid: true, message: "" };
    }
  }

  // ========================================================================
  // PRIVATE DOMAIN VALIDATORS
  // ========================================================================

  private async validateProduct(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name || String(data.name).trim() === "") {
      errors.push({ field: "name", message: "Product name is required" });
    }

    if (data.price !== undefined && data.price !== "") {
      const price = parseFloat(data.price);
      if (isNaN(price) || price < 0) {
        errors.push({ field: "price", message: "Invalid price value" });
      }
    }

    if (data.barcode && String(data.barcode).length > 50) {
      errors.push({
        field: "barcode",
        message: "Barcode too long (max 50 characters)",
      });
    }

    if (!data.category) {
      warnings.push({
        field: "category",
        message: "Category not specified, will use default",
      });
    }

    return { errors, warnings };
  }

  private async validateMachine(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.serialNumber || String(data.serialNumber).trim() === "") {
      errors.push({
        field: "serialNumber",
        message: "Serial number is required",
      });
    }

    if (!data.model) {
      warnings.push({ field: "model", message: "Model not specified" });
    }

    return { errors, warnings };
  }

  private async validateUser(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push({ field: "email", message: "Valid email is required" });
    }

    if (!data.firstName) {
      errors.push({ field: "firstName", message: "First name is required" });
    }

    return { errors, warnings };
  }

  private async validateEmployee(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.firstName) {
      errors.push({ field: "firstName", message: "First name is required" });
    }

    if (!data.lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }

    if (!data.employeeRole) {
      errors.push({
        field: "employeeRole",
        message: "Employee role is required",
      });
    }

    return { errors, warnings };
  }

  private async validateTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.amount || isNaN(parseFloat(data.amount))) {
      errors.push({ field: "amount", message: "Valid amount is required" });
    }

    if (!data.transactionDate) {
      errors.push({
        field: "transactionDate",
        message: "Transaction date is required",
      });
    }

    return { errors, warnings };
  }

  private async validateSale(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.machineId && !data.machineSerial) {
      errors.push({
        field: "machineId",
        message: "Machine ID or serial number is required",
      });
    }

    if (!data.saleDate) {
      errors.push({ field: "saleDate", message: "Sale date is required" });
    }

    if (!data.amount || isNaN(parseFloat(data.amount))) {
      errors.push({ field: "amount", message: "Valid amount is required" });
    }

    return { errors, warnings };
  }

  private async validateInventory(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.productId && !data.productSku && !data.productBarcode) {
      errors.push({
        field: "productId",
        message: "Product identifier is required",
      });
    }

    if (!data.quantity || isNaN(parseFloat(data.quantity))) {
      errors.push({ field: "quantity", message: "Valid quantity is required" });
    }

    return { errors, warnings };
  }

  private async validateCustomer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.phone && !data.email) {
      errors.push({ field: "phone", message: "Phone or email is required" });
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({ field: "email", message: "Invalid email format" });
    }

    return { errors, warnings };
  }

  private async validatePrice(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.productId && !data.productSku) {
      errors.push({
        field: "productId",
        message: "Product identifier is required",
      });
    }

    if (
      !data.price ||
      isNaN(parseFloat(data.price)) ||
      parseFloat(data.price) < 0
    ) {
      errors.push({
        field: "price",
        message: "Valid positive price is required",
      });
    }

    return { errors, warnings };
  }

  private async validateCategory(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name) {
      errors.push({ field: "name", message: "Category name is required" });
    }

    return { errors, warnings };
  }

  private async validateLocation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name && !data.address) {
      errors.push({
        field: "name",
        message: "Location name or address is required",
      });
    }

    return { errors, warnings };
  }

  private async validateContractor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.companyName) {
      errors.push({
        field: "companyName",
        message: "Company name is required",
      });
    }

    if (!data.serviceType) {
      errors.push({
        field: "serviceType",
        message: "Service type is required",
      });
    }

    return { errors, warnings };
  }

  private async validateGeneric(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    return { errors: [], warnings: [] };
  }
}
