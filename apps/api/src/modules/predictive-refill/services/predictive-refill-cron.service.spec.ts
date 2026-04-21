import { Test, TestingModule } from "@nestjs/testing";
import { PredictiveRefillCronService } from "./predictive-refill-cron.service";
import { ConsumptionRateService } from "./consumption-rate.service";
import { RecommendationService } from "./recommendation.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Organization } from "../../organizations/entities/organization.entity";

describe("PredictiveRefillCronService", () => {
  let service: PredictiveRefillCronService;
  let consumptionRateService: jest.Mocked<ConsumptionRateService>;
  let recommendationService: jest.Mocked<RecommendationService>;
  let orgRepo: { find: jest.Mock };

  beforeEach(async () => {
    orgRepo = {
      find: jest.fn().mockResolvedValue([
        { id: "org-1", isActive: true },
        { id: "org-2", isActive: true },
        { id: "org-3", isActive: true },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveRefillCronService,
        {
          provide: ConsumptionRateService,
          useValue: { refreshForOrg: jest.fn().mockResolvedValue(5) },
        },
        {
          provide: RecommendationService,
          useValue: { generateForOrganization: jest.fn().mockResolvedValue(3) },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: orgRepo,
        },
      ],
    }).compile();

    service = module.get(PredictiveRefillCronService);
    consumptionRateService = module.get(ConsumptionRateService);
    recommendationService = module.get(RecommendationService);
  });

  it("should iterate all active organizations", async () => {
    await service.nightlyRefresh();
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledTimes(3);
    expect(recommendationService.generateForOrganization).toHaveBeenCalledTimes(
      3,
    );
  });

  it("should call services with each org id", async () => {
    await service.nightlyRefresh();
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledWith("org-1");
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledWith("org-2");
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledWith("org-3");
    expect(recommendationService.generateForOrganization).toHaveBeenCalledWith(
      "org-1",
    );
    expect(recommendationService.generateForOrganization).toHaveBeenCalledWith(
      "org-2",
    );
    expect(recommendationService.generateForOrganization).toHaveBeenCalledWith(
      "org-3",
    );
  });

  it("should continue processing when one org fails", async () => {
    consumptionRateService.refreshForOrg
      .mockResolvedValueOnce(5)
      .mockRejectedValueOnce(new Error("DB timeout"))
      .mockResolvedValueOnce(5);

    await expect(service.nightlyRefresh()).resolves.not.toThrow();
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledTimes(3);
  });

  it("should not throw when no orgs exist", async () => {
    orgRepo.find.mockResolvedValue([]);
    await expect(service.nightlyRefresh()).resolves.not.toThrow();
    expect(consumptionRateService.refreshForOrg).not.toHaveBeenCalled();
  });

  it("should resolve even when all orgs fail", async () => {
    consumptionRateService.refreshForOrg.mockRejectedValue(
      new Error("total failure"),
    );
    await expect(service.nightlyRefresh()).resolves.not.toThrow();
    expect(consumptionRateService.refreshForOrg).toHaveBeenCalledTimes(3);
  });
});
