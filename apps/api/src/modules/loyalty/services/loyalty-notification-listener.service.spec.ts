import { Test, TestingModule } from "@nestjs/testing";

import { LoyaltyNotificationListenerService } from "./loyalty-notification-listener.service";
import { WebPushService } from "../../web-push/web-push.service";
import { LoyaltyLevel } from "../constants/loyalty.constants";

describe("LoyaltyNotificationListenerService", () => {
  let service: LoyaltyNotificationListenerService;
  let webPush: jest.Mocked<Pick<WebPushService, "sendToUser">>;

  const userId = "user-uuid-1";

  beforeEach(async () => {
    webPush = {
      sendToUser: jest.fn().mockResolvedValue(1),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyNotificationListenerService,
        { provide: WebPushService, useValue: webPush },
      ],
    }).compile();
    service = module.get(LoyaltyNotificationListenerService);
  });

  it("sends a tier-specific push on level_up", async () => {
    await service.handleLevelUp({
      userId,
      oldLevel: LoyaltyLevel.SILVER,
      newLevel: LoyaltyLevel.GOLD,
      newBalance: 5500,
    });

    expect(webPush.sendToUser).toHaveBeenCalledWith(
      userId,
      expect.stringContaining("Золото"),
      expect.stringContaining("3%"),
      "/loyalty",
      expect.objectContaining({
        type: "loyalty.level_up",
        newLevel: LoyaltyLevel.GOLD,
      }),
    );
  });

  it("skips push when the tier is unknown", async () => {
    await service.handleLevelUp({
      userId,
      oldLevel: LoyaltyLevel.BRONZE,
      newLevel: "unknown-tier" as LoyaltyLevel,
      newBalance: 100,
    });
    expect(webPush.sendToUser).not.toHaveBeenCalled();
  });

  it("does not throw when sendToUser rejects", async () => {
    webPush.sendToUser.mockRejectedValueOnce(new Error("VAPID broken"));
    await expect(
      service.handleLevelUp({
        userId,
        oldLevel: LoyaltyLevel.BRONZE,
        newLevel: LoyaltyLevel.SILVER,
        newBalance: 1100,
      }),
    ).resolves.toBeUndefined();
  });
});
