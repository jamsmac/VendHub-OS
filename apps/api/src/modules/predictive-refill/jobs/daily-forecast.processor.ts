import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { ConsumptionRateService } from "../services/consumption-rate.service";
import { RecommendationService } from "../services/recommendation.service";

@Processor("predictive-refill")
export class DailyForecastProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyForecastProcessor.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly consumptionRateService: ConsumptionRateService,
    private readonly recommendationService: RecommendationService,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ orgs: number; rates: number; recs: number; failures: number }> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);
    const orgs = await this.orgRepo.find({
      where: { isActive: true },
      select: ["id"],
    });

    let totalRates = 0;
    let totalRecs = 0;
    let failures = 0;

    for (const org of orgs) {
      try {
        const rates = await this.consumptionRateService.refreshForOrg(
          org.id,
          14,
        );
        const recs = await this.recommendationService.generateForOrganization(
          org.id,
        );
        totalRates += rates;
        totalRecs += recs;
      } catch (err: unknown) {
        failures++;
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error(
          `Org ${org.id} failed: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Recalc complete: ${orgs.length} orgs, ${totalRates} rates, ${totalRecs} recs, ${failures} failures`,
    );
    return { orgs: orgs.length, rates: totalRates, recs: totalRecs, failures };
  }
}
