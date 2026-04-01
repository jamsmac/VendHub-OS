import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import {
  Task,
  TaskItem,
  TaskComment,
  TaskComponent,
  TaskPhoto,
} from "./entities/task.entity";
import { Incident } from "../incidents/entities/incident.entity";
import { TaskAnalyticsService } from "./services/task-analytics.service";
import { TaskAutoGenerationService } from "./services/task-auto-generation.service";
import { ContainersModule } from "../containers/containers.module";
import { Organization } from "../organizations/entities/organization.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskItem,
      TaskComment,
      TaskComponent,
      TaskPhoto,
      Incident,
      Organization,
    ]),
    ContainersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskAnalyticsService, TaskAutoGenerationService],
  exports: [TasksService],
})
export class TasksModule {}
