import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { TracingService } from "./tracing.service";

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;

    const spanId = this.tracingService.startSpan(`${method} ${url}`, {
      "http.method": method,
      "http.url": url,
      "http.user_agent": headers?.["user-agent"] || "",
    });

    // Attach trace context to request for downstream use
    request.traceSpanId = spanId;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.tracingService.endSpan(spanId, "OK", {
            "http.status_code": response.statusCode,
          });
        },
        error: (error) => {
          this.tracingService.endSpan(spanId, "ERROR", {
            "error.message": error?.message || "Unknown error",
            "http.status_code": error?.status || 500,
          });
        },
      }),
    );
  }
}
