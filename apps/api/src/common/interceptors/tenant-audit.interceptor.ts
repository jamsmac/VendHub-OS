import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { ClsService } from "nestjs-cls";

/**
 * TenantAuditInterceptor
 *
 * In development mode, inspects API responses for tenant isolation violations.
 * If a response contains items with `organizationId` that doesn't match the
 * requesting user's org, logs a warning. Does NOT block — audit only.
 *
 * This catches IDOR bugs during development without affecting production performance.
 */
@Injectable()
export class TenantAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantAuditInterceptor.name);
  private readonly isEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.TENANT_AUDIT === "true";

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.isEnabled) return next.handle();

    const userOrgId = this.cls.get("organizationId") as string | undefined;
    if (!userOrgId) return next.handle();

    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    return next.handle().pipe(
      tap((response) => {
        if (!response) return;
        this.auditResponse(response, userOrgId, `${controller}.${handler}`);
      }),
    );
  }

  private auditResponse(
    data: unknown,
    expectedOrgId: string,
    context: string,
  ): void {
    if (Array.isArray(data)) {
      for (const item of data.slice(0, 20)) {
        this.checkItem(item, expectedOrgId, context);
      }
    } else if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      // Check paginated response { data: [...], total: N }
      if (Array.isArray(obj.data)) {
        for (const item of (obj.data as unknown[]).slice(0, 20)) {
          this.checkItem(item, expectedOrgId, context);
        }
      } else {
        this.checkItem(obj, expectedOrgId, context);
      }
    }
  }

  private checkItem(
    item: unknown,
    expectedOrgId: string,
    context: string,
  ): void {
    if (typeof item !== "object" || item === null) return;
    const obj = item as Record<string, unknown>;

    if (
      "organizationId" in obj &&
      obj.organizationId &&
      obj.organizationId !== expectedOrgId
    ) {
      this.logger.warn(
        `TENANT VIOLATION in ${context}: response contains organizationId=${obj.organizationId} but user belongs to ${expectedOrgId}`,
      );
    }
  }
}
