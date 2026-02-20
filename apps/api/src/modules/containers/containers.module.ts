/**
 * Containers Module
 * Manages hoppers/bunkers within vending machines
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Container } from "./entities/container.entity";
import { ContainersController } from "./containers.controller";
import { ContainersService } from "./containers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Container])],
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}
