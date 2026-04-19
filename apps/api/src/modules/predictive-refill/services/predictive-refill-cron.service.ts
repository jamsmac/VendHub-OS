import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { ConsumptionRateService } from "./consumption-rate.service";
import { RecommendationService } from "./recommendation.service";

@Injectable()
export class PredictiveRefillCronService {
  private readonly logger = new Logger(PredictiveRefillCronService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly consumptionRateService: ConsumptionRateService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Cron("0 2 * * *", { timeZone: "Asia/Tashkent" })
  async nightlyRefresh(): Promise<void> {
    this.logger.log("Nightly predictive refill recalc starting");
    const startTime = Date.now();

    const orgs = await this.orgRepo.find({
      where: { isActive: true },
      select: ["id"],
    });

    let totalRates = 0;
    let totalRecs = 0;
    let failedOrgs = 0;

    for (const org of orgs) {
      try {
        const rates = await this.consumptionRateService.refreshForOrg(org.id);
        const recs = await this.recommendationService.generateForOrganization(
          org.id,
        );
        totalRates += rates;
        totalRecs += recs;
      } catch (err) {
        failedOrgs++;
        this.logger.error(
          `Predictive refill failed for org ${org.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(
      `Nightly recalc complete: ${orgs.length} orgs, ${totalRates} rates, ${totalRecs} recs, ${failedOrgs} failures, ${duration}s`,
    );
  }
}
