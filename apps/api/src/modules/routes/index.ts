/**
 * Routes Module Barrel Export
 */

export * from "./routes.module";
export * from "./routes.service";
export * from "./route-optimization.service";
export * from "./routes.controller";

// Entities
export {
  Route,
  RouteType,
  RouteStatus,
  RouteStop,
  RouteStopStatus,
  TransportType,
} from "./entities/route.entity";
export { RoutePoint } from "./entities/route-point.entity";
export {
  RouteAnomaly,
  AnomalyType,
  AnomalySeverity,
} from "./entities/route-anomaly.entity";
export {
  RouteTaskLink,
  RouteTaskLinkStatus,
} from "./entities/route-task-link.entity";

// Services
export { GpsProcessingService } from "./services/gps-processing.service";
export { RouteTrackingService } from "./services/route-tracking.service";
export { RouteAnalyticsService } from "./services/route-analytics.service";

// DTOs
export { CreateRouteDto, UpdateRouteDto } from "./dto/create-route.dto";
export {
  CreateRouteStopDto,
  UpdateRouteStopDto,
  ReorderStopsDto,
} from "./dto/create-route-stop.dto";
export {
  StartRouteDto,
  EndRouteDto,
  CancelRouteDto,
  RecordPointDto,
  RecordPointsBatchDto,
  UpdateLiveLocationDto,
  LinkTaskDto,
  CompleteLinkedTaskDto,
  ResolveAnomalyDto,
  ListAnomaliesQueryDto,
  RouteAnalyticsQueryDto,
} from "./dto/start-route.dto";
