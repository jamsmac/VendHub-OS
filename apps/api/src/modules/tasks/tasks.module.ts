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
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
