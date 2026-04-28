import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { MaintenanceNotificationListenerService } from "./maintenance-notification-listener.service";
import { WebPushService } from "../../web-push/web-push.service";
import { User } from "../../users/entities/user.entity";

describe("MaintenanceNotificationListenerService", () => {
  let service: MaintenanceNotificationListenerService;
  let webPush: jest.Mocked<Pick<WebPushService, "sendToUser">>;
  let userRepo: { find: jest.Mock };

  const orgId = "org-uuid-1";
  const requestId = "mnt-uuid-1";
  const technicianId = "tech-uuid-1";
  const managerId = "mgr-uuid-1";
  const adminId = "adm-uuid-1";

  const buildRequest = (overrides: Record<string, unknown> = {}) =>
    ({
      id: requestId,
      organizationId: orgId,
      requestNumber: "MNT-2025-000001",
      title: "Кофеварка №3 не выдаёт пар",
      machineId: "machine-uuid-1",
      assignedTechnicianId: technicianId,
      ...overrides,
    }) as never;

  beforeEach(async () => {
    webPush = {
      sendToUser: jest.fn().mockResolvedValue(1),
    };
    userRepo = {
      find: jest.fn().mockResolvedValue([{ id: managerId }, { id: adminId }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceNotificationListenerService,
        { provide: WebPushService, useValue: webPush },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = module.get(MaintenanceNotificationListenerService);
  });

  it("pushes to assigned technician + all managers/admins/owners", async () => {
    await service.handleSlaBreached({ request: buildRequest() });

    const calls = webPush.sendToUser.mock.calls.map((c) => c[0]);
    expect(new Set(calls)).toEqual(new Set([technicianId, managerId, adminId]));
    expect(webPush.sendToUser).toHaveBeenCalledTimes(3);
  });

  it("dedupes when assigned technician is also a manager", async () => {
    userRepo.find.mockResolvedValue([{ id: technicianId }, { id: managerId }]);

    await service.handleSlaBreached({ request: buildRequest() });

    const userIds = webPush.sendToUser.mock.calls.map((c) => c[0]);
    // technicianId appears once even though it's in both the assigned
    // slot and the managers query.
    expect(userIds.filter((id) => id === technicianId)).toHaveLength(1);
  });

  it("scopes the user query to the request's organization", async () => {
    await service.handleSlaBreached({ request: buildRequest() });

    expect(userRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: orgId }),
      }),
    );
  });

  it("logs and returns when no recipients can be resolved", async () => {
    userRepo.find.mockResolvedValue([]);

    await service.handleSlaBreached({
      request: buildRequest({ assignedTechnicianId: undefined }),
    });

    expect(webPush.sendToUser).not.toHaveBeenCalled();
  });

  it("does not throw when one push rejects (others must still go out)", async () => {
    webPush.sendToUser
      .mockRejectedValueOnce(new Error("subscription expired"))
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    await expect(
      service.handleSlaBreached({ request: buildRequest() }),
    ).resolves.toBeUndefined();
    expect(webPush.sendToUser).toHaveBeenCalledTimes(3);
  });

  it("truncates long titles in the body for push readability", async () => {
    await service.handleSlaBreached({
      request: buildRequest({
        title:
          "Длинное описание задачи на обслуживание которое определённо превышает разумную длину для уведомления и должно быть обрезано",
      }),
    });

    const body = webPush.sendToUser.mock.calls[0]?.[2];
    expect(body).toMatch(/\.\.\.$/);
    expect((body ?? "").length).toBeLessThanOrEqual(80);
  });
});
