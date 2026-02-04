import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RouteOptimizationService } from './route-optimization.service';
import { RoutesController } from './routes.controller';
import { Route, RouteStop } from './entities/route.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Route,
      RouteStop,
    ]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService, RouteOptimizationService],
  exports: [RoutesService, RouteOptimizationService],
})
export class RoutesModule {}
