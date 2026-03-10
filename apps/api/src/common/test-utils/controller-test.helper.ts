/**
 * Shared controller test helper — reduces boilerplate for smoke tests.
 *
 * Usage:
 *   const { app, mockService } = await createControllerTestApp(MyController, MyService, ['findAll', 'create']);
 *   // ... use supertest against app.getHttpServer()
 *   await app.close();
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
  CanActivate,
  ExecutionContext,
  Type,
  Provider,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { APP_GUARD } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

// Token → user mapping
const USERS: Record<
  string,
  { id: string; role: string; organizationId: string }
> = {
  "Bearer admin-token": {
    id: "550e8400-e29b-41d4-a716-446655440000",
    role: "admin",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
  },
  "Bearer owner-token": {
    id: "550e8400-e29b-41d4-a716-446655440002",
    role: "owner",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
  },
  "Bearer operator-token": {
    id: "550e8400-e29b-41d4-a716-446655440003",
    role: "operator",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
  },
  "Bearer viewer-token": {
    id: "550e8400-e29b-41d4-a716-446655440004",
    role: "viewer",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
  },
};

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  accountant: 50,
  warehouse: 40,
  operator: 30,
  viewer: 10,
};

export { USERS, ROLE_HIERARCHY };

/**
 * Create a test NestJS app with mocked auth guards and a mocked service.
 *
 * @param controller  The controller class under test
 * @param serviceClass  The service class to mock
 * @param methods  Service method names to stub as jest.fn()
 * @param extraProviders  Any additional providers (optional)
 */
export async function createControllerTestApp<S>(
  controller: Type<unknown>,
  serviceClass: Type<S>,
  methods: string[],
  extraProviders: Provider[] = [],
): Promise<{ app: INestApplication; mockService: Record<string, jest.Mock> }> {
  const mockService: Record<string, jest.Mock> = {};
  for (const m of methods) {
    mockService[m] = jest.fn().mockResolvedValue({});
  }

  const reflector = new Reflector();

  // Auth guard stub — resolves token to user, respects @Public()
  const jwtGuardStub: CanActivate = {
    canActivate(context: ExecutionContext) {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        // Still set user if auth header is present (for optional auth)
        const req = context.switchToHttp().getRequest();
        const auth: string | undefined = req.headers?.authorization;
        if (auth && USERS[auth]) {
          req.user = USERS[auth];
        }
        return true;
      }
      const req = context.switchToHttp().getRequest();
      const auth: string | undefined = req.headers?.authorization;
      if (
        !auth ||
        !auth.startsWith("Bearer ") ||
        auth === "Bearer invalid-token"
      ) {
        throw new UnauthorizedException();
      }
      const user = USERS[auth];
      if (!user) throw new UnauthorizedException();
      req.user = user;
      return true;
    },
  };

  // Roles guard stub — checks role hierarchy
  const rolesGuardStubFactory = () => {
    const guard: CanActivate = {
      canActivate(context: ExecutionContext) {
        const requiredRoles = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) return true;
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) throw new ForbiddenException();
        const userLevel = ROLE_HIERARCHY[user.role] || 0;
        const hasRole = requiredRoles.some((role: string) => {
          if (role === user.role) return true;
          const requiredLevel = ROLE_HIERARCHY[role] || 100;
          return userLevel >= requiredLevel;
        });
        if (!hasRole) throw new ForbiddenException("Insufficient permissions");
        return true;
      },
    };
    return guard;
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [controller],
    providers: [
      { provide: serviceClass, useValue: mockService },
      // ThrottlerGuard stub
      {
        provide: APP_GUARD,
        useValue: { canActivate: () => true } as CanActivate,
      },
      // JwtAuthGuard stub (APP_GUARD — for controllers without @UseGuards)
      {
        provide: APP_GUARD,
        useValue: jwtGuardStub,
      },
      // RolesGuard stub (APP_GUARD — for controllers without @UseGuards)
      {
        provide: APP_GUARD,
        useFactory: rolesGuardStubFactory,
      },
      ...extraProviders,
    ],
  })
    // Override @UseGuards(JwtAuthGuard) on controllers
    .overrideGuard(JwtAuthGuard)
    .useValue(jwtGuardStub)
    // Override @UseGuards(RolesGuard) on controllers
    .overrideGuard(RolesGuard)
    .useValue(rolesGuardStubFactory())
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, mockService };
}

/** Valid UUID for test params */
export const TEST_UUID = "550e8400-e29b-41d4-a716-446655440099";
