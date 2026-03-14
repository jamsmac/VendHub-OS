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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskItem,
      TaskComment,
      TaskComponent,
      TaskPhoto,
      Incident,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskAnalyticsService],
  exports: [TasksService],
})
export class TasksModule {}
