import { Global, Module, OnModuleInit } from "@nestjs/common";
import { TracingService } from "./tracing.service";

@Global()
@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule implements OnModuleInit {
  constructor(private readonly tracingService: TracingService) {}

  onModuleInit(): void {
    this.tracingService.initialize();
  }
}
