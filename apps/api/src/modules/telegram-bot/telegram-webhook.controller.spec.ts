import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TelegramWebhookController } from "./telegram-webhook.controller";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";

describe("TelegramWebhookController", () => {
  let controller: TelegramWebhookController;
  let configService: { get: jest.Mock };
  let staffBot: { handleUpdate: jest.Mock };
  let customerBot: { handleUpdate: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };
    staffBot = { handleUpdate: jest.fn().mockResolvedValue(undefined) };
    customerBot = { handleUpdate: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramWebhookController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: TelegramBotService, useValue: staffBot },
        { provide: TelegramCustomerBotService, useValue: customerBot },
      ],
    }).compile();

    controller = module.get(TelegramWebhookController);
  });

  describe("staffUpdate", () => {
    it("accepts valid secret and forwards update", async () => {
      configService.get.mockReturnValue("correct-secret");
      const update = { update_id: 1, message: {} };

      const result = await controller.staffUpdate("correct-secret", update);

      expect(result).toEqual({ ok: true });
      expect(staffBot.handleUpdate).toHaveBeenCalledWith(update);
    });

    it("rejects missing secret header", async () => {
      configService.get.mockReturnValue("correct-secret");

      await expect(
        controller.staffUpdate(undefined as any, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects wrong secret", async () => {
      configService.get.mockReturnValue("correct-secret");

      await expect(controller.staffUpdate("wrong-secret", {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects when secret not configured in env", async () => {
      configService.get.mockReturnValue(undefined);

      await expect(controller.staffUpdate("any-secret", {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects different-length secret (timing attack defense)", async () => {
      configService.get.mockReturnValue("short");

      await expect(
        controller.staffUpdate("much-longer-secret-value", {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("customerUpdate", () => {
    it("accepts valid secret and forwards update", async () => {
      configService.get.mockReturnValue("customer-secret");
      const update = { update_id: 2, message: {} };

      const result = await controller.customerUpdate("customer-secret", update);

      expect(result).toEqual({ ok: true });
      expect(customerBot.handleUpdate).toHaveBeenCalledWith(update);
    });

    it("rejects wrong secret", async () => {
      configService.get.mockReturnValue("customer-secret");

      await expect(controller.customerUpdate("wrong", {})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
