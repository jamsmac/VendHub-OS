/**
 * Tasks Module Barrel Export
 */

export * from './tasks.module';
export * from './tasks.service';
export * from './tasks.controller';

// Entities - explicit exports to avoid duplication with DTOs
export {
  Task,
  TaskItem,
  TaskComment,
  TaskType,
  TaskStatus,
  TaskPriority,
  ComponentRole,
} from './entities/task.entity';

// DTOs - only non-conflicting exports
export { CreateTaskDto, UpdateTaskDto, QueryTasksDto } from './dto/create-task.dto';
