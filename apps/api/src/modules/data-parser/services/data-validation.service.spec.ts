import { Test, TestingModule } from "@nestjs/testing";
import { DataValidationService } from "./data-validation.service";

describe("DataValidationService", () => {
  let service: DataValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataValidationService],
    }).compile();

    service = module.get<DataValidationService>(DataValidationService);
  });

  // --------------------------------------------------------------------------
  // UZ Phone validation (+998XXXXXXXXX)
  // --------------------------------------------------------------------------

  it("should validate correct UZ phone numbers", () => {
    expect(service.isValidPhone("+998901234567")).toBe(true);
    expect(service.isValidPhone("+998 90 123 45 67")).toBe(true);
    expect(service.isValidPhone("+998-90-123-45-67")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(service.isValidPhone("+79001234567")).toBe(false);
    expect(service.isValidPhone("998901234567")).toBe(false);
    expect(service.isValidPhone("+99890123")).toBe(false);
    expect(service.isValidPhone("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // INN validation (9 or 14 digits)
  // --------------------------------------------------------------------------

  it("should validate 9-digit company INN", () => {
    expect(service.isValidInn("123456789")).toBe(true);
  });

  it("should validate 14-digit individual INN", () => {
    expect(service.isValidInn("12345678901234")).toBe(true);
  });

  it("should reject invalid INN lengths", () => {
    expect(service.isValidInn("12345")).toBe(false);
    expect(service.isValidInn("1234567890")).toBe(false);
    expect(service.isValidInn("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Passport validation (AA1234567)
  // --------------------------------------------------------------------------

  it("should validate correct UZ passport format", () => {
    expect(service.isValidPassport("AA1234567")).toBe(true);
    expect(service.isValidPassport("ab1234567")).toBe(true); // lowercase
    expect(service.isValidPassport("AB 1234567")).toBe(true); // with space
  });

  it("should reject invalid passport formats", () => {
    expect(service.isValidPassport("A1234567")).toBe(false); // 1 letter
    expect(service.isValidPassport("ABC123456")).toBe(false); // 3 letters
    expect(service.isValidPassport("AA123456")).toBe(false); // 6 digits
    expect(service.isValidPassport("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // MFO validation (5 digits)
  // --------------------------------------------------------------------------

  it("should validate correct MFO codes", () => {
    expect(service.isValidMfo("12345")).toBe(true);
    expect(service.isValidMfo("00123")).toBe(true);
  });

  it("should reject invalid MFO codes", () => {
    expect(service.isValidMfo("1234")).toBe(false);
    expect(service.isValidMfo("123456")).toBe(false);
    expect(service.isValidMfo("abcde")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Bank account validation (20 digits)
  // --------------------------------------------------------------------------

  it("should validate 20-digit bank account numbers", () => {
    expect(service.isValidBankAccount("12345678901234567890")).toBe(true);
  });

  it("should reject bank account with wrong length", () => {
    expect(service.isValidBankAccount("1234567890")).toBe(false);
    expect(service.isValidBankAccount("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Amount validation
  // --------------------------------------------------------------------------

  it("should validate positive amounts within 1B UZS", () => {
    expect(service.isValidAmount(100)).toBe(true);
    expect(service.isValidAmount(1_000_000_000)).toBe(true);
    expect(service.isValidAmount("5000")).toBe(true);
  });

  it("should reject invalid amounts", () => {
    expect(service.isValidAmount(0)).toBe(false);
    expect(service.isValidAmount(-100)).toBe(false);
    expect(service.isValidAmount(1_000_000_001)).toBe(false);
    expect(service.isValidAmount("abc")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Email validation
  // --------------------------------------------------------------------------

  it("should validate correct email formats", () => {
    expect(service.isValidEmail("user@example.com")).toBe(true);
    expect(service.isValidEmail("a@b.uz")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(service.isValidEmail("not-email")).toBe(false);
    expect(service.isValidEmail("")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Date parsing
  // --------------------------------------------------------------------------

  it("should parse DD.MM.YYYY format", () => {
    const date = service.parseDate("15.03.2025");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(2); // March = 2
    expect(date!.getDate()).toBe(15);
  });

  it("should parse YYYY-MM-DD ISO format", () => {
    const date = service.parseDate("2025-03-15");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2025);
  });

  it("should parse DD/MM/YYYY format", () => {
    const date = service.parseDate("15/03/2025");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getDate()).toBe(15);
  });

  it("should return null for unparseable date strings", () => {
    expect(service.parseDate("not-a-date")).toBeNull();
    expect(service.parseDate("")).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Row-level validation: sales
  // --------------------------------------------------------------------------

  it("should validate sales rows requiring amount or quantity", () => {
    const result = service.validateSalesRows([
      { amount: 5000 },
      { quantity: 10 },
      {},
    ]);

    expect(result.validRows).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  // --------------------------------------------------------------------------
  // Row-level validation: counterparties
  // --------------------------------------------------------------------------

  it("should validate counterparty rows requiring name", () => {
    const result = service.validateCounterpartyRows([
      { name: "Company A", inn: "123456789" },
      { inn: "12345" }, // missing name + invalid INN
    ]);

    expect(result.validRows).toBe(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  // --------------------------------------------------------------------------
  // Row-level validation: inventory
  // --------------------------------------------------------------------------

  it("should validate inventory rows requiring product identifier", () => {
    const result = service.validateInventoryRows([
      { name: "Product A", quantity: 10 },
      { quantity: -5 }, // no identifier + negative quantity
    ]);

    expect(result.validRows).toBe(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
