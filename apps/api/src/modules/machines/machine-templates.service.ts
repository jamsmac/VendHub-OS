/**
 * MachineTemplatesService
 *
 * CRUD for machine templates + createFromTemplate logic.
 * When creating a machine from template, it auto-provisions:
 * - Containers (bunkers) from defaultContainers
 * - MachineSlots from defaultSlots
 * - MachineComponents from defaultComponents
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { MachineTemplate } from "./entities/machine-template.entity";
import {
  Machine,
  MachineSlot,
  MachineComponent,
  ComponentStatus,
  ComponentType,
} from "./entities/machine.entity";
import { Container } from "../containers/entities/container.entity";
import {
  CreateMachineTemplateDto,
  UpdateMachineTemplateDto,
  CreateMachineFromTemplateDto,
} from "./dto/machine-template.dto";

@Injectable()
export class MachineTemplatesService {
  constructor(
    @InjectRepository(MachineTemplate)
    private readonly templateRepo: Repository<MachineTemplate>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(MachineSlot)
    private readonly slotRepo: Repository<MachineSlot>,
    @InjectRepository(MachineComponent)
    private readonly componentRepo: Repository<MachineComponent>,
    private readonly dataSource: DataSource,
  ) {}

  // ── CRUD ──

  /** Nil UUID used for system-wide templates visible to all organizations */
  private readonly SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

  async findAll(organizationId: string): Promise<MachineTemplate[]> {
    return this.templateRepo.find({
      where: [
        { organizationId },
        { organizationId: this.SYSTEM_ORG_ID },
      ],
      order: { isSystem: "DESC", type: "ASC", name: "ASC" },
    });
  }

  async findActive(organizationId: string): Promise<MachineTemplate[]> {
    return this.templateRepo.find({
      where: [
        { organizationId, isActive: true },
        { organizationId: this.SYSTEM_ORG_ID, isActive: true },
      ],
      order: { isSystem: "DESC", type: "ASC", name: "ASC" },
    });
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<MachineTemplate> {
    const template = await this.templateRepo.findOne({
      where: [
        { id, organizationId },
        { id, organizationId: this.SYSTEM_ORG_ID },
      ],
    });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async create(
    dto: CreateMachineTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<MachineTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      organizationId,
      defaultContainers: dto.defaultContainers ?? [],
      defaultSlots: dto.defaultSlots ?? [],
      defaultComponents: dto.defaultComponents ?? [],
      createdById: userId,
    });
    return this.templateRepo.save(template);
  }

  async update(
    id: string,
    dto: UpdateMachineTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<MachineTemplate> {
    const template = await this.findOne(id, organizationId);
    Object.assign(template, dto, { updatedById: userId });
    return this.templateRepo.save(template);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);
    if (template.isSystem) {
      throw new ConflictException("Cannot delete system template");
    }
    await this.templateRepo.softDelete(id);
  }

  // ── Create Machine from Template (transactional) ──

  async createFromTemplate(
    dto: CreateMachineFromTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<Machine> {
    const template = await this.findOne(dto.templateId, organizationId);

    return this.dataSource.transaction(async (manager) => {
      // 1. Create the machine
      const machine = manager.create(Machine, {
        organizationId,
        machineNumber: dto.machineNumber,
        name: dto.name,
        serialNumber: dto.serialNumber,
        templateId: template.id,
        type: template.type,
        contentModel: template.contentModel,
        manufacturer: template.manufacturer,
        model: template.model,
        maxProductSlots: template.maxProductSlots,
        acceptsCash: template.acceptsCash,
        acceptsCard: template.acceptsCard,
        acceptsQr: template.acceptsQr,
        acceptsNfc: template.acceptsNfc,
        locationId: dto.locationId,
        purchasePrice: dto.purchasePrice,
        createdById: userId,
      });
      const savedMachine = await manager.save(machine);

      // 2. Create containers from template
      if (template.defaultContainers.length > 0) {
        const containers = template.defaultContainers.map((c) =>
          manager.create(Container, {
            organizationId,
            machineId: savedMachine.id,
            slotNumber: c.slotNumber,
            name: c.name,
            capacity: c.capacity,
            unit: c.unit,
            minLevel: c.minLevel ?? null,
            currentQuantity: 0,
            createdById: userId,
          }),
        );
        await manager.save(containers);
      }

      // 3. Create slots from template
      if (template.defaultSlots.length > 0) {
        const slots = template.defaultSlots.map((s) =>
          manager.create(MachineSlot, {
            machineId: savedMachine.id,
            slotNumber: s.slotNumber,
            capacity: s.capacity,
            currentQuantity: 0,
            createdById: userId,
          }),
        );
        await manager.save(slots);
      }

      // 4. Create components from template
      if (template.defaultComponents.length > 0) {
        const components = template.defaultComponents.map((comp) =>
          manager.create(MachineComponent, {
            machineId: savedMachine.id,
            componentType: comp.componentType as ComponentType,
            name: comp.name,
            status: ComponentStatus.INSTALLED,
            installedAt: new Date(),
            installedByUserId: userId,
            createdById: userId,
          }),
        );
        await manager.save(components);
      }

      return savedMachine;
    });
  }
}
