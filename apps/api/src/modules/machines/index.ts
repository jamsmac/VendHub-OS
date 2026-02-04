/**
 * Machines Module Barrel Export
 */

export * from './machines.module';
export * from './machines.service';
export * from './machines.controller';

// Entities - explicit exports to avoid duplication with DTOs
export {
  Machine,
  MachineStatus,
  MachineType,
  MachineSlot,
  MachineComponent,
  ComponentType,
  ComponentStatus,
} from './entities/machine.entity';

// DTOs - only non-conflicting exports
export { CreateMachineDto, UpdateMachineDto } from './dto/create-machine.dto';
