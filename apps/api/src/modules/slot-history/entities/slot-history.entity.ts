import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import { User } from "../../users/entities/user.entity";

export enum SlotHistoryAction {
  SET = "set",
  CLEAR = "clear",
  UPDATE_QTY = "update_qty",
  UPDATE_PRICE = "update_price",
}

@Entity("slot_history")
@Index(["organizationId", "machineId", "at"])
@Index(["organizationId", "at"])
export class SlotHistory extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  @Column({ type: "varchar", length: 20 })
  slotNumber: string;

  @Column({ type: "enum", enum: SlotHistoryAction })
  action: SlotHistoryAction;

  @Column({ type: "uuid", nullable: true })
  prevProductId: string | null;

  @ManyToOne(() => Product, { onDelete: "SET NULL" })
  @JoinColumn({ name: "prev_product_id" })
  prevProduct: Product | null;

  @Column({ type: "uuid", nullable: true })
  newProductId: string | null;

  @ManyToOne(() => Product, { onDelete: "SET NULL" })
  @JoinColumn({ name: "new_product_id" })
  newProduct: Product | null;

  @Column({ type: "int", nullable: true })
  prevQuantity: number | null;

  @Column({ type: "int", nullable: true })
  newQuantity: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  prevPrice: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  newPrice: number | null;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "uuid", nullable: true })
  byUserId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "by_user_id" })
  byUser: User | null;

  @Column({ type: "timestamp with time zone" })
  at: Date;
}
