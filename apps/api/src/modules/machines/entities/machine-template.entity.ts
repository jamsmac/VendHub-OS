/**
 * MachineTemplate Entity
 *
 * Шаблон автомата — справочник моделей вендинговых машин.
 * При создании нового автомата выбирается шаблон, и система
 * автоматически создаёт бункеры/слоты/компоненты по умолчанию.
 *
 * Template → Instance pattern:
 * - Template описывает ЧТО должно быть (8 бункеров, 2 компонента)
 * - Machine — это экземпляр, созданный по шаблону
 */

import { Entity, Column, Index } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseEntity } from "../../../common/entities/base.entity";
import {
  MachineType,
  ContentModel,
} from "@vendhub/shared";
import type {
  IContainerTemplate,
  ISlotTemplate,
  IComponentTemplate,
} from "@vendhub/shared";

@Entity("machine_templates")
@Index(["organizationId"])
@Index(["type"])
@Index(["isActive"])
export class MachineTemplate extends BaseEntity {
  @ApiProperty({ description: "Organization UUID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ example: "Necta Korinto Prime", description: "Template display name" })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ enum: MachineType, description: "Machine business category" })
  @Column({ type: "enum", enum: MachineType })
  type: MachineType;

  @ApiProperty({ enum: ContentModel, description: "How this machine stores products" })
  @Column({ type: "enum", enum: ContentModel })
  contentModel: ContentModel;

  @ApiPropertyOptional({ example: "Necta", description: "Manufacturer name" })
  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @ApiPropertyOptional({ example: "Korinto Prime", description: "Model name" })
  @Column({ length: 100, nullable: true })
  model: string;

  @ApiPropertyOptional({ description: "Template description" })
  @Column({ type: "text", nullable: true })
  description: string;

  @ApiPropertyOptional({ description: "Image URL for UI preview" })
  @Column({ type: "text", nullable: true })
  imageUrl: string;

  // ── Content defaults ──

  @ApiProperty({ example: 0, description: "Default product slots count (0 for container-based)" })
  @Column({ type: "int", default: 0 })
  maxProductSlots: number;

  @ApiProperty({
    description: "Default containers/bunkers config",
    example: [{ slotNumber: 1, name: "Кофе зёрна", capacity: 1200, unit: "g" }],
  })
  @Column({ type: "jsonb", default: [] })
  defaultContainers: IContainerTemplate[];

  @ApiProperty({
    description: "Default product slots config",
    example: [{ slotNumber: "A1", capacity: 10 }],
  })
  @Column({ type: "jsonb", default: [] })
  defaultSlots: ISlotTemplate[];

  @ApiProperty({
    description: "Default components (grinder, brew unit, etc.)",
    example: [{ componentType: "grinder", name: "Встроенная кофемолка" }],
  })
  @Column({ type: "jsonb", default: [] })
  defaultComponents: IComponentTemplate[];

  // ── Payment method defaults ──

  @ApiProperty({ default: true })
  @Column({ default: true })
  acceptsCash: boolean;

  @ApiProperty({ default: false })
  @Column({ default: false })
  acceptsCard: boolean;

  @ApiProperty({ default: false })
  @Column({ default: false })
  acceptsQr: boolean;

  @ApiProperty({ default: false })
  @Column({ default: false })
  acceptsNfc: boolean;

  // ── Flags ──

  @ApiProperty({ description: "System template (pre-seeded, non-deletable)" })
  @Column({ default: false })
  isSystem: boolean;

  @ApiProperty({ description: "Whether this template can be selected" })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
