import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { CustomerComplaintsService } from "./customer-complaints.service";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/complaint", chat: { id: 123456789, type: "private" } },
    callbackQuery: null,
    ...overrides,
  } as any;
}

describe("CustomerComplaintsService", () => {
  let service: CustomerComplaintsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerComplaintsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CustomerComplaintsService>(CustomerComplaintsService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // askForMachineCode
  // ==========================================================================

  describe("askForMachineCode", () => {
    it('should display a "coming soon" placeholder for complaints', async () => {
      const ctx = createMockContext();
      await service.askForMachineCode(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("скоро будет доступна");
      expect(text).toContain("vendhub_support");
    });

    it("should include a menu button", async () => {
      const ctx = createMockContext();
      await service.askForMachineCode(ctx);

      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // handleMachineCode (delegates to askForMachineCode)
  // ==========================================================================

  describe("handleMachineCode", () => {
    it("should display the same placeholder as askForMachineCode", async () => {
      const ctx = createMockContext();
      await service.handleMachineCode(ctx, "VH-001");

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("скоро будет доступна");
    });
  });

  // ==========================================================================
  // showMyComplaints
  // ==========================================================================

  describe("showMyComplaints", () => {
    it('should display "coming soon" placeholder', async () => {
      const ctx = createMockContext();
      await service.showMyComplaints(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Мои обращения");
      expect(text).toContain("скоро будет доступна");
    });
  });

  // ==========================================================================
  // showComplaintDetails (delegates to showMyComplaints)
  // ==========================================================================

  describe("showComplaintDetails", () => {
    it("should display the same placeholder as showMyComplaints", async () => {
      const ctx = createMockContext();
      await service.showComplaintDetails(ctx, "complaint-123");

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Мои обращения");
    });
  });

  // ==========================================================================
  // startRefundFlow
  // ==========================================================================

  describe("startRefundFlow", () => {
    it('should display refund "coming soon" placeholder', async () => {
      const ctx = createMockContext();
      await service.startRefundFlow(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Возврат средств");
      expect(text).toContain("скоро будет доступна");
    });
  });

  // ==========================================================================
  // askForTransactionId
  // ==========================================================================

  describe("askForTransactionId", () => {
    it('should display transaction status "coming soon" placeholder', async () => {
      const ctx = createMockContext();
      await service.askForTransactionId(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Статус транзакции");
      expect(text).toContain("скоро будет доступна");
    });
  });

  // ==========================================================================
  // Notification stubs (no-ops)
  // ==========================================================================

  describe("sendComplaintStatusUpdate", () => {
    it("should not throw (no-op)", async () => {
      await expect(
        service.sendComplaintStatusUpdate("123456", {} as any),
      ).resolves.not.toThrow();
    });
  });

  describe("sendRefundNotification", () => {
    it("should not throw (no-op)", async () => {
      await expect(
        service.sendRefundNotification("123456", 50000, "approved"),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Other flow stubs
  // ==========================================================================

  describe("handlePhone", () => {
    it("should not throw (no-op)", async () => {
      const ctx = createMockContext();
      await expect(
        service.handlePhone(ctx, "+998901234567"),
      ).resolves.not.toThrow();
    });
  });

  describe("handlePhoto", () => {
    it("should not throw (no-op)", async () => {
      const ctx = createMockContext();
      await expect(
        service.handlePhoto(ctx, "file-id-123"),
      ).resolves.not.toThrow();
    });
  });
});
