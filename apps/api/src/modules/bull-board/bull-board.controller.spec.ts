import { Test, TestingModule } from "@nestjs/testing";
import { BullBoardController } from "./bull-board.controller";

describe("BullBoardController", () => {
  let controller: BullBoardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BullBoardController],
    }).compile();

    controller = module.get<BullBoardController>(BullBoardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("checkAccess", () => {
    it("should return status ok with dashboard URL", () => {
      const result = controller.checkAccess();

      expect(result).toEqual({
        status: "ok",
        message: "Queue dashboard access granted",
        dashboardUrl: "/admin/queues",
      });
    });
  });
});
