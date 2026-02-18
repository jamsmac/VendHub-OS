/**
 * Logging Interceptor
 *
 * Logs all incoming requests and their responses using
 * the structured AppLoggerService (Winston).
 *
 * - Reads requestId from CLS context (set by ClsModule middleware)
 * - Masks sensitive fields (password, token, etc.) in logged request bodies
 * - Logs structured request/response data for production JSON ingestion
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { AppLoggerService } from "../services/logger.service";
import { maskSensitiveData } from "../utils/mask-sensitive";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly cls: ClsService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, body, query, params } = request;
    const userAgent = request.get("user-agent") || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (request as any).user?.id || "anonymous";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizationId = (request as any).user?.organizationId;

    // Store user context in CLS for audit subscriber and downstream services
    if (userId !== "anonymous") {
      this.cls.set("userId", userId);
    }
    if (organizationId) {
      this.cls.set("organizationId", organizationId);
    }

    const requestId = this.cls.get("requestId") as string | undefined;
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`-> [${method}] ${url} - User: ${userId}`, "HTTP");

    this.logger.debug(
      JSON.stringify({
        type: "http_request_detail",
        requestId,
        method,
        url,
        ip,
        userId,
        organizationId,
        userAgent: userAgent.substring(0, 100),
        query: Object.keys(query).length > 0 ? query : undefined,
        params: Object.keys(params).length > 0 ? params : undefined,
        body:
          body && Object.keys(body).length > 0
            ? maskSensitiveData(body)
            : undefined,
      }),
      "HTTP",
    );

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.logRequest({
            method,
            url,
            statusCode,
            duration,
            userId: userId !== "anonymous" ? userId : undefined,
            requestId,
            ip,
          });

          this.logger.log(
            `<- [${method}] ${url} - ${statusCode} - ${duration}ms`,
            "HTTP",
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `<- [${method}] ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
            error.stack,
            "HTTP",
          );

          this.logger.logRequest({
            method,
            url,
            statusCode,
            duration,
            userId: userId !== "anonymous" ? userId : undefined,
            requestId,
            ip,
          });
        },
      }),
    );
  }
}
