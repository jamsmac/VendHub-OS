/**
 * Common Module for VendHub OS
 * Provides shared guards, interceptors, pipes and filters
 */

import { Module, Global, BadRequestException } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Interceptors
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

// Services
import { AppLoggerService } from './services/logger.service';

// Guards - kept for reference, can be enabled for global guard setup
// import { RolesGuard } from './guards/roles.guard';
// import { OrganizationGuard } from './guards/organization.guard';
// import { ThrottleGuard } from './guards/throttle.guard';

@Global()
@Module({
  providers: [
    // Structured Winston logger
    AppLoggerService,

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true, // Strip unknown properties
          forbidNonWhitelisted: true, // Throw error on unknown properties
          transform: true, // Transform payload to DTO instances
          transformOptions: {
            enableImplicitConversion: true,
          },
          stopAtFirstError: false, // Return all validation errors
          exceptionFactory: (errors) => {
            const messages = errors.map((error) => {
              const constraints = Object.values(error.constraints || {});
              return constraints.join(', ');
            });
            return new BadRequestException(messages);
          },
        }),
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },

    // Note: Guards should be applied at controller/route level
    // or via JwtAuthGuard from auth module
    // Uncomment below if you want global guards:
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottleGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: OrganizationGuard,
    // },
  ],
  exports: [AppLoggerService],
})
export class CommonModule {}
