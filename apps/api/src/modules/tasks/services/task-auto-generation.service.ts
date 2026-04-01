/**
 * Task Auto-Generation Service
 *
 * Automatically creates REFILL tasks when container levels drop below thresholds.
 *
 * Triggers:
 *   A. Cron (every 2 hours) — scans all containers across all orgs
 *   B. Event-driven — 'sale.cogs.calculated' checks the sale's machine containers
 *
 * Logic:
 *   1. Find containers where currentQuantity <= minLevel (isLow)
 *   2. Group by machineId
 *   3. For each machine, check if an active REFILL task already exists
 *   4. If not, create a REFILL task with items = one per low container
 *   5. Priority based on fill percentage: <10% URGENT, <20% HIGH, else NORMAL
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";
import { ContainersService } from "../../containers/containers.service";
import { TasksService } from "../tasks.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { TaskType, TaskPriority } from "@vendhub/shared";
import type { Task } from "../entities/task.entity";

/** Flattened low-container info for grouping and task creation */
interface LowContainerInfo {
  id: string;
  machineId: string;
  nomenclatureId: string | null;
  name: string | null;
  currentQuantity: number;
  capacity: number;
  fillPercentage: number;
  deficit: number;
  unit: string;
}

@Injectable()
export class TaskAutoGenerationService {
  private readonly logger = new Logger(TaskAutoGenerationService.name);

  constructor(
    private readonly containersService: ContainersService,
    private readonly tasksService: TasksService,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  // ════════════════════════════════════════════
  // TRIGGER A: Cron — every 2 hours
  // ════════════════════════════════════════════

  @Cron("0 */2 * * *", { timeZone: "Asia/Tashkent" })
  async cronCheckAllOrganizations(): Promise<void> {
    this.logger.log("Cron: checking container levels for all organizations");

    try {
      const organizations = await this.orgRepo.find({
        where: { isActive: true },
        select: ["id"],
      });

      let totalTasksCreated = 0;

      for (const org of organizations) {
        const count = await this.checkAndCreateTasks(org.id);
        totalTasksCreated += count;
      }

      if (totalTasksCreated > 0) {
        this.logger.log(
          `Cron completed: ${totalTasksCreated} auto-tasks created across ${organizations.length} organizations`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Cron failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ════════════════════════════════════════════
  // TRIGGER B: Event-driven after sale COGS
  // ════════════════════════════════════════════

  @OnEvent("sale.cogs.calculated")
  async onSaleCompleted(event: {
    transactionId: string;
    organizationId: string;
  }): Promise<void> {
    try {
      await this.checkAndCreateTasks(event.organizationId);
    } catch (error) {
      this.logger.error(
        `Event-driven task generation failed for org ${event.organizationId}: ` +
          `${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ════════════════════════════════════════════
  // CORE: Check containers and create tasks
  // ════════════════════════════════════════════

  async checkAndCreateTasks(organizationId: string): Promise<number> {
    // Get all low-level containers for the organization
    const rawLowContainers =
      await this.containersService.checkAllLowLevels(organizationId);

    if (rawLowContainers.length === 0) return 0;

    // Flatten the wrapped response into LowContainerInfo
    const lowContainers: LowContainerInfo[] = rawLowContainers.map(
      ({ container: c, fillPercentage, deficit }) => ({
        id: c.id,
        machineId: c.machineId,
        nomenclatureId: c.nomenclatureId ?? null,
        name: c.name,
        currentQuantity: Number(c.currentQuantity),
        capacity: Number(c.capacity),
        fillPercentage,
        deficit,
        unit: c.unit || "g",
      }),
    );

    // Group by machineId
    const byMachine = new Map<string, LowContainerInfo[]>();
    for (const c of lowContainers) {
      const machineId = c.machineId;
      if (!byMachine.has(machineId)) {
        byMachine.set(machineId, []);
      }
      byMachine.get(machineId)!.push(c);
    }

    let tasksCreated = 0;

    for (const [machineId, containers] of byMachine) {
      try {
        // Determine priority based on lowest fill percentage
        const lowestFill = Math.min(...containers.map((c) => c.fillPercentage));
        const priority = this.determinePriority(lowestFill);

        // Build description listing which containers need refilling
        const description = this.buildDescription(containers);

        // Build task items — one per low container
        const items = containers
          .filter((c) => c.nomenclatureId)
          .map((c) => ({
            productId: c.nomenclatureId!,
            plannedQuantity: c.deficit,
          }));

        // Calculate due date: 4 hours from now
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 4);

        // Create the task (TasksService.create handles conflict check internally)
        await this.tasksService.create({
          organizationId,
          machineId,
          typeCode: TaskType.REFILL,
          priority,
          description,
          dueDate,
          items: items as unknown as Partial<Task>["items"],
          metadata: {
            autoGenerated: true,
            triggerType: "inventory_threshold",
            lowestFillPercentage: lowestFill,
            containerCount: containers.length,
            generatedAt: new Date().toISOString(),
          },
        });

        tasksCreated++;

        this.logger.log(
          `Auto-task REFILL created for machine ${machineId}: ` +
            `${containers.length} low containers, priority=${priority}, ` +
            `lowest fill=${lowestFill}%`,
        );
      } catch (error) {
        // BadRequestException = machine already has active task — that's OK
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already has an active task")) {
          this.logger.debug(
            `Skipped auto-task for machine ${machineId}: active task exists`,
          );
        } else {
          this.logger.error(
            `Failed to create auto-task for machine ${machineId}: ${message}`,
          );
        }
      }
    }

    return tasksCreated;
  }

  // ════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════

  private determinePriority(fillPercentage: number): TaskPriority {
    if (fillPercentage < 10) return TaskPriority.URGENT;
    if (fillPercentage < 20) return TaskPriority.HIGH;
    return TaskPriority.NORMAL;
  }

  private buildDescription(containers: LowContainerInfo[]): string {
    const lines = containers.map(
      (c) =>
        `• ${c.name || "Container"}: ${c.currentQuantity}/${c.capacity} ${c.unit} (${c.fillPercentage}%, deficit: ${c.deficit})`,
    );
    return `Автозаполнение: ${containers.length} бункер(ов) ниже порога\n${lines.join("\n")}`;
  }
}
