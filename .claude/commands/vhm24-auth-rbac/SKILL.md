---
name: vhm24-auth-rbac
description: |
  VendHub Auth & RBAC - аутентификация JWT/TOTP и ролевой доступ NestJS.
  Passport стратегии, Guards, декораторы, 7 ролей.
  Использовать при работе с авторизацией и разграничением прав.
---

# VendHub Auth & RBAC

Система аутентификации (JWT + TOTP 2FA) и ролевого доступа на NestJS Passport.

## Когда использовать

- Аутентификация пользователей (JWT access/refresh токены)
- Двухфакторная аутентификация (TOTP через otplib)
- Проверка прав доступа через NestJS Guards
- Защита эндпоинтов декораторами @Roles(), @Auth(), @Public()
- Управление 7 ролями и разрешениями
- Хеширование паролей (bcrypt)
- Защита роутов и компонентов на фронтенде

---

## 1. Роли системы (7 ролей)

```typescript
// src/modules/auth/enums/role.enum.ts

/** 7 ролей VendHub — иерархия от owner до viewer */
export enum Role {
  OWNER = 'owner',           // Владелец организации. Полный доступ, управление подписками и биллингом
  ADMIN = 'admin',           // Администратор. Всё кроме биллинга: пользователи, настройки, автоматы
  MANAGER = 'manager',       // Менеджер. Управление операциями, задачами, инвентарём, отчётами
  OPERATOR = 'operator',     // Оператор. Загрузка автоматов, инкассация, выполнение задач
  WAREHOUSE = 'warehouse',   // Склад. Приёмка, перемещение, списание товаров
  ACCOUNTANT = 'accountant', // Бухгалтер. Финансы, отчёты, сверки, экспорт
  VIEWER = 'viewer',         // Наблюдатель. Только просмотр дашбордов и отчётов
}

/** Иерархия ролей — чем меньше число, тем выше привилегии */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.OWNER]: 0,
  [Role.ADMIN]: 1,
  [Role.MANAGER]: 2,
  [Role.OPERATOR]: 3,
  [Role.WAREHOUSE]: 4,
  [Role.ACCOUNTANT]: 5,
  [Role.VIEWER]: 6,
};
```

---

## 2. Разрешения (Permissions)

```typescript
// src/modules/auth/enums/permission.enum.ts

/** Все разрешения системы, сгруппированные по модулям */
export enum Permission {
  // Автоматы
  MACHINES_VIEW = 'machines:view',
  MACHINES_CREATE = 'machines:create',
  MACHINES_EDIT = 'machines:edit',
  MACHINES_DELETE = 'machines:delete',

  // Инвентарь / склад
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_WRITE_OFF = 'inventory:write_off',
  INVENTORY_RECEIVE = 'inventory:receive',

  // Задачи
  TASKS_VIEW = 'tasks:view',
  TASKS_CREATE = 'tasks:create',
  TASKS_ASSIGN = 'tasks:assign',
  TASKS_COMPLETE = 'tasks:complete',

  // Финансы
  FINANCE_VIEW = 'finance:view',
  FINANCE_TRANSACTIONS = 'finance:transactions',
  FINANCE_RECONCILE = 'finance:reconcile',
  FINANCE_EXPORT = 'finance:export',

  // Отчёты
  REPORTS_VIEW = 'reports:view',
  REPORTS_CREATE = 'reports:create',
  REPORTS_EXPORT = 'reports:export',

  // Настройки
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',

  // Пользователи
  USERS_VIEW = 'users:view',
  USERS_INVITE = 'users:invite',
  USERS_MANAGE = 'users:manage',
  USERS_DELETE = 'users:delete',
}
```

---

## 3. Маппинг роль → разрешения

```typescript
// src/modules/auth/constants/role-permissions.ts

import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

/** Базовые разрешения каждой роли */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Owner — все разрешения без исключений
  [Role.OWNER]: Object.values(Permission),

  // Admin — всё кроме удаления пользователей (только owner)
  [Role.ADMIN]: Object.values(Permission).filter(
    (p) => p !== Permission.USERS_DELETE,
  ),

  // Manager — операции, задачи, инвентарь, отчёты, просмотр пользователей
  [Role.MANAGER]: [
    Permission.MACHINES_VIEW, Permission.MACHINES_CREATE, Permission.MACHINES_EDIT,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.TASKS_VIEW, Permission.TASKS_CREATE, Permission.TASKS_ASSIGN,
    Permission.FINANCE_VIEW,
    Permission.REPORTS_VIEW, Permission.REPORTS_CREATE, Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW,
    Permission.USERS_VIEW,
  ],

  // Operator — автоматы (просмотр), инвентарь (просмотр/перемещение), задачи (просмотр/выполнение)
  [Role.OPERATOR]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.TASKS_VIEW, Permission.TASKS_COMPLETE,
    Permission.REPORTS_VIEW,
  ],

  // Warehouse — склад и инвентарь, просмотр задач
  [Role.WAREHOUSE]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.INVENTORY_WRITE_OFF, Permission.INVENTORY_RECEIVE,
    Permission.TASKS_VIEW,
    Permission.REPORTS_VIEW,
  ],

  // Accountant — финансы, отчёты, экспорт
  [Role.ACCOUNTANT]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.FINANCE_VIEW, Permission.FINANCE_TRANSACTIONS,
    Permission.FINANCE_RECONCILE, Permission.FINANCE_EXPORT,
    Permission.REPORTS_VIEW, Permission.REPORTS_CREATE, Permission.REPORTS_EXPORT,
  ],

  // Viewer — только просмотр
  [Role.VIEWER]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.TASKS_VIEW,
    Permission.REPORTS_VIEW,
  ],
};
```

### Таблица ролей и разрешений

| Разрешение            | owner | admin | manager | operator | warehouse | accountant | viewer |
|-----------------------|:-----:|:-----:|:-------:|:--------:|:---------:|:----------:|:------:|
| machines:view         |  да   |  да   |   да    |    да    |    да     |     да     |   да   |
| machines:create       |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| machines:edit         |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| machines:delete       |  да   |  да   |    -    |    -     |     -     |      -     |    -   |
| inventory:view        |  да   |  да   |   да    |    да    |    да     |     да     |   да   |
| inventory:transfer    |  да   |  да   |   да    |    да    |    да     |      -     |    -   |
| inventory:write_off   |  да   |  да   |    -    |    -     |    да     |      -     |    -   |
| inventory:receive     |  да   |  да   |    -    |    -     |    да     |      -     |    -   |
| tasks:view            |  да   |  да   |   да    |    да    |    да     |      -     |   да   |
| tasks:create          |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| tasks:assign          |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| tasks:complete        |  да   |  да   |    -    |    да    |     -     |      -     |    -   |
| finance:view          |  да   |  да   |   да    |    -     |     -     |     да     |    -   |
| finance:transactions  |  да   |  да   |    -    |    -     |     -     |     да     |    -   |
| finance:reconcile     |  да   |  да   |    -    |    -     |     -     |     да     |    -   |
| finance:export        |  да   |  да   |    -    |    -     |     -     |     да     |    -   |
| reports:view          |  да   |  да   |   да    |    да    |    да     |     да     |   да   |
| reports:create        |  да   |  да   |   да    |    -     |     -     |     да     |    -   |
| reports:export        |  да   |  да   |   да    |    -     |     -     |     да     |    -   |
| settings:view         |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| settings:edit         |  да   |  да   |    -    |    -     |     -     |      -     |    -   |
| users:view            |  да   |  да   |   да    |    -     |     -     |      -     |    -   |
| users:invite          |  да   |  да   |    -    |    -     |     -     |      -     |    -   |
| users:manage          |  да   |  да   |    -    |    -     |     -     |      -     |    -   |
| users:delete          |  да   |   -   |    -    |    -     |     -     |      -     |    -   |

---

## 4. JWT Strategy (Passport)

```typescript
// src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/** Payload, который зашит в JWT токен */
export interface JwtPayload {
  sub: number;          // userId
  email: string;
  role: Role;
  organizationId: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Passport вызывает после успешной верификации токена */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь деактивирован или не найден');
    }

    // Возвращённый объект попадает в request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      permissions: user.permissions,
    };
  }
}
```

---

## 5. NestJS Guards

### JwtAuthGuard

```typescript
// src/modules/auth/guards/jwt-auth.guard.ts

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Глобальный Guard аутентификации.
 * Все эндпоинты защищены по умолчанию.
 * Для публичных эндпоинтов используйте декоратор @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Если эндпоинт помечен @Public() — пропускаем без токена
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### RolesGuard

```typescript
// src/modules/auth/guards/roles.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

/**
 * Guard проверки ролей.
 * Работает в паре с декоратором @Roles().
 * Если декоратор не указан — пропускает всех аутентифицированных.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если @Roles() не указан — доступ разрешён всем аутентифицированным
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    // Owner имеет доступ ко всему
    if (user.role === Role.OWNER) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Требуется одна из ролей: ${requiredRoles.join(', ')}. Ваша роль: ${user.role}`,
      );
    }

    return true;
  }
}
```

### OrganizationGuard

```typescript
// src/modules/auth/guards/organization.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard мультитенантности.
 * Проверяет, что запрашиваемый ресурс принадлежит организации пользователя.
 * Параметр organizationId берётся из URL-параметра :orgId или из тела запроса.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // orgId из URL-параметра или из body
    const orgId =
      Number(request.params.orgId) ||
      Number(request.body?.organizationId);

    if (!orgId) {
      // Нет orgId в запросе — пропускаем (другие guards проверят)
      return true;
    }

    if (user.organizationId !== orgId) {
      throw new ForbiddenException('Нет доступа к данной организации');
    }

    return true;
  }
}
```

---

## 6. Декораторы

### @Public()

```typescript
// src/modules/auth/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

/** Ключ метаданных для публичных эндпоинтов */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Помечает эндпоинт как публичный — JwtAuthGuard пропустит без токена.
 * Использование: @Public() над контроллером или методом.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### @Roles()

```typescript
// src/modules/auth/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/** Ключ метаданных для required-ролей */
export const ROLES_KEY = 'roles';

/**
 * Задаёт список допустимых ролей для эндпоинта.
 * Использование: @Roles(Role.ADMIN, Role.MANAGER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### @Auth() (составной декоратор)

```typescript
// src/modules/auth/decorators/auth.decorator.ts

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '../enums/role.enum';

/**
 * Составной декоратор: аутентификация + проверка ролей + Swagger-документация.
 * Использование:
 *   @Auth(Role.ADMIN, Role.MANAGER) — только admin и manager
 *   @Auth()                         — любой аутентифицированный пользователь
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Не аутентифицирован' }),
    ApiForbiddenResponse({ description: 'Недостаточно прав' }),
  );
}
```

### @CurrentUser()

```typescript
// src/modules/auth/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Извлекает текущего пользователя из request.
 * Использование:
 *   @CurrentUser() user: JwtPayload          — весь объект пользователя
 *   @CurrentUser('id') userId: number        — только поле id
 *   @CurrentUser('role') role: Role          — только поле role
 *   @CurrentUser('organizationId') orgId: number
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Если передано имя поля — вернуть конкретное значение
    return data ? user?.[data] : user;
  },
);
```

---

## 7. Auth DTOs (class-validator)

```typescript
// src/modules/auth/dto/login.dto.ts

import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** DTO для входа по email + пароль */
export class LoginDto {
  @ApiProperty({ example: 'user@vendhub.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(8, { message: 'Пароль минимум 8 символов' })
  @MaxLength(128, { message: 'Пароль максимум 128 символов' })
  password: string;
}
```

```typescript
// src/modules/auth/dto/register.dto.ts

import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

/** DTO для регистрации нового пользователя */
export class RegisterDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(2, { message: 'Имя минимум 2 символа' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'user@vendhub.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(8, { message: 'Пароль минимум 8 символов' })
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VIEWER })
  @IsOptional()
  @IsEnum(Role, { message: 'Недопустимая роль' })
  role?: Role;
}
```

```typescript
// src/modules/auth/dto/totp.dto.ts

import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** DTO для верификации TOTP-кода двухфакторной аутентификации */
export class VerifyTotpDto {
  @ApiProperty({ example: '123456', description: '6-значный TOTP-код из приложения-аутентификатора' })
  @IsString()
  @Length(6, 6, { message: 'TOTP-код должен быть 6 цифр' })
  code: string;
}
```

```typescript
// src/modules/auth/dto/refresh-token.dto.ts

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** DTO для обновления access-токена по refresh-токену */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh-токен, полученный при логине' })
  @IsString()
  refreshToken: string;
}
```

---

## 8. Auth Service (bcrypt + TOTP)

```typescript
// src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  /** Число раундов bcrypt — баланс между безопасностью и скоростью */
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Регистрация ────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    // Хешируем пароль через bcrypt
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Логин ──────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Сравниваем пароль через bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    // Если включена 2FA — возвращаем промежуточный ответ
    if (user.isTotpEnabled) {
      return {
        requiresTwoFactor: true,
        tempToken: await this.generateTempToken(user.id),
      };
    }

    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Обновление токена ──────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Пользователь не найден или деактивирован');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Невалидный refresh-токен');
    }
  }

  // ─── TOTP (2FA) ─────────────────────────────────────────────

  /** Генерация секрета и QR-ссылки для привязки приложения-аутентификатора */
  async setupTotp(userId: number) {
    const user = await this.usersService.findById(userId);

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.email,
      'VendHub',
      secret,
    );

    // Сохраняем секрет (не активируем до верификации)
    await this.usersService.update(userId, { totpSecret: secret });

    return { secret, otpauthUrl };
  }

  /** Верификация TOTP-кода и активация 2FA */
  async verifyAndEnableTotp(userId: number, code: string) {
    const user = await this.usersService.findById(userId);

    if (!user.totpSecret) {
      throw new BadRequestException('Сначала вызовите setup-totp');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Неверный TOTP-код');
    }

    await this.usersService.update(userId, { isTotpEnabled: true });

    return { enabled: true };
  }

  /** Проверка TOTP при логине (второй шаг) */
  async verifyTotpLogin(tempToken: string, code: string) {
    const { sub: userId } = this.jwtService.verify(tempToken, {
      secret: this.configService.get<string>('JWT_TEMP_SECRET'),
    });

    const user = await this.usersService.findById(userId);

    const isValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Неверный TOTP-код');
    }

    return {
      user: this.sanitizeUser(user),
      ...(await this.generateTokens(user)),
    };
  }

  // ─── Вспомогательные методы ─────────────────────────────────

  /** Генерация пары access + refresh токенов */
  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /** Временный токен для 2FA (короткий TTL) */
  private async generateTempToken(userId: number) {
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_TEMP_SECRET'),
        expiresIn: '5m',
      },
    );
  }

  /** Убираем пароль и секреты из ответа */
  private sanitizeUser(user: any) {
    const { password, totpSecret, ...safe } = user;
    return safe;
  }
}
```

---

## 9. Auth Controller

```typescript
// src/modules/auth/auth.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyTotpDto } from './dto/totp.dto';
import { Public } from './decorators/public.decorator';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Аутентификация')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Публичные эндпоинты ────────────────────────────────────

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан, токены выданы' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiResponse({ status: 200, description: 'Токены выданы или требуется 2FA' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access-токена по refresh-токену' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Public()
  @Post('totp/verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Второй шаг логина — проверка TOTP-кода' })
  async verifyTotpLogin(
    @Body('tempToken') tempToken: string,
    @Body() dto: VerifyTotpDto,
  ) {
    return this.authService.verifyTotpLogin(tempToken, dto.code);
  }

  // ─── Защищённые эндпоинты ──────────────────────────────────

  @Auth()
  @Post('totp/setup')
  @ApiOperation({ summary: 'Генерация TOTP-секрета для привязки 2FA' })
  async setupTotp(@CurrentUser('id') userId: number) {
    return this.authService.setupTotp(userId);
  }

  @Auth()
  @Post('totp/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Активация 2FA после верификации кода' })
  async enableTotp(
    @CurrentUser('id') userId: number,
    @Body() dto: VerifyTotpDto,
  ) {
    return this.authService.verifyAndEnableTotp(userId, dto.code);
  }
}
```

---

## 10. Регистрация модуля (NestJS)

```typescript
// src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,

    // Глобальный guard аутентификации — все роуты защищены по умолчанию
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Глобальный guard ролей — работает с декоратором @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## 11. Примеры использования в контроллерах

```typescript
// src/modules/machines/machines.controller.ts

import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('machines')
export class MachinesController {
  // Любой аутентифицированный пользователь
  @Auth()
  @Get()
  findAll(@CurrentUser('organizationId') orgId: number) {
    return this.machinesService.findByOrg(orgId);
  }

  // Только owner, admin, manager
  @Auth(Role.OWNER, Role.ADMIN, Role.MANAGER)
  @Post()
  create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateMachineDto,
  ) {
    return this.machinesService.create(userId, dto);
  }

  // Только owner и admin могут удалять
  @Auth(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.machinesService.remove(id);
  }
}
```

---

## 12. Frontend: Zustand auth store

```typescript
// src/stores/auth.store.ts

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { Role } from '@/types/auth';
import { Permission } from '@/types/permissions';
import { ROLE_PERMISSIONS } from '@/constants/role-permissions';

/** Данные пользователя, полученные от сервера */
interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number;
  permissions: Permission[];  // Кастомные разрешения сверх роли
  isTotpEnabled: boolean;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Логин — сохраняет токены и пользователя */
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;

  /** Выход — очистка стора */
  logout: () => void;

  /** Обновление access-токена */
  setAccessToken: (token: string) => void;

  /** Проверка конкретного разрешения с учётом роли */
  hasPermission: (permission: Permission) => boolean;

  /** Проверка роли */
  hasRole: (role: Role) => boolean;

  /** Проверка любой из ролей */
  hasAnyRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: true,

        setAuth: (user, accessToken, refreshToken) =>
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          }),

        logout: () =>
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          }),

        setAccessToken: (token) => set({ accessToken: token }),

        hasPermission: (permission) => {
          const { user } = get();
          if (!user) return false;

          // Owner имеет все разрешения
          if (user.role === Role.OWNER) return true;

          // Кастомные разрешения пользователя
          if (user.permissions?.includes(permission)) return true;

          // Разрешения роли
          return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
        },

        hasRole: (role) => {
          const { user } = get();
          return user?.role === role;
        },

        hasAnyRole: (roles) => {
          const { user } = get();
          return user ? roles.includes(user.role) : false;
        },
      }),
      {
        name: 'vendhub-auth',
        // Сохраняем в localStorage только токены
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
);
```

---

## 13. Frontend: Axios-инстанс с interceptors

```typescript
// src/lib/api.ts

import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

/** Настроенный Axios-инстанс с автоподстановкой токена и рефрешем */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: подставляем access-токен ─────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: авторефреш при 401 ──────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

/** Повторно отправляем все запросы из очереди после рефреша */
function processQueue(error: any, token: string | null) {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если 401 и запрос ещё не повторялся
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Не рефрешим эндпоинты аутентификации
      if (originalRequest.url?.includes('/auth/')) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Ставим запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        useAuthStore.getState().setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

---

## 14. Frontend: useAuth хук

```typescript
// src/hooks/useAuth.ts

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import type { LoginDto, RegisterDto } from '@/types/auth';

/** Хук аутентификации — обёртка над стором для компонентов */
export function useAuth() {
  const navigate = useNavigate();
  const store = useAuthStore();

  /** Логин: отправляем email+пароль, обрабатываем 2FA если нужно */
  const login = useCallback(async (dto: LoginDto) => {
    const { data } = await api.post('/auth/login', dto);

    if (data.requiresTwoFactor) {
      // Сохраняем tempToken и перенаправляем на 2FA
      return { requiresTwoFactor: true, tempToken: data.tempToken };
    }

    store.setAuth(data.user, data.accessToken, data.refreshToken);
    navigate('/dashboard');
    return { requiresTwoFactor: false };
  }, [navigate, store]);

  /** Регистрация */
  const register = useCallback(async (dto: RegisterDto) => {
    const { data } = await api.post('/auth/register', dto);
    store.setAuth(data.user, data.accessToken, data.refreshToken);
    navigate('/dashboard');
  }, [navigate, store]);

  /** Верификация TOTP-кода (второй шаг логина) */
  const verifyTotp = useCallback(async (tempToken: string, code: string) => {
    const { data } = await api.post('/auth/totp/verify-login', {
      tempToken,
      code,
    });
    store.setAuth(data.user, data.accessToken, data.refreshToken);
    navigate('/dashboard');
  }, [navigate, store]);

  /** Выход */
  const logout = useCallback(() => {
    store.logout();
    navigate('/login');
  }, [navigate, store]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
    login,
    register,
    verifyTotp,
    logout,
  };
}
```

---

## 15. Frontend: PermissionGate и ProtectedRoute

### PermissionGate

```tsx
// src/components/auth/PermissionGate.tsx

import { useMemo, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Permission } from '@/types/permissions';

interface PermissionGateProps {
  /** Требуемое разрешение или массив разрешений */
  permission: Permission | Permission[];
  /** Если true — нужны ВСЕ разрешения, иначе хотя бы одно (по умолчанию true) */
  requireAll?: boolean;
  /** Что показывать при отсутствии доступа */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Компонент-обёртка для условного рендеринга по разрешениям.
 * Если у пользователя нет нужных прав — рендерит fallback.
 */
export function PermissionGate({
  permission,
  requireAll = true,
  fallback = null,
  children,
}: PermissionGateProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const hasAccess = useMemo(() => {
    if (Array.isArray(permission)) {
      return requireAll
        ? permission.every((p) => hasPermission(p))
        : permission.some((p) => hasPermission(p));
    }
    return hasPermission(permission);
  }, [permission, hasPermission, requireAll]);

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── Примеры использования ─────────────────────────────────────
//
// <PermissionGate permission={Permission.MACHINES_EDIT}>
//   <Button onClick={handleEdit}>Редактировать</Button>
// </PermissionGate>
//
// <PermissionGate
//   permission={[Permission.FINANCE_VIEW, Permission.FINANCE_EXPORT]}
//   requireAll={false}
//   fallback={<p>Нет доступа к финансовому модулю</p>}
// >
//   <FinanceModule />
// </PermissionGate>
```

### ProtectedRoute

```tsx
// src/components/auth/ProtectedRoute.tsx

import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/types/auth';
import { Permission } from '@/types/permissions';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AccessDenied } from '@/components/ui/AccessDenied';

interface ProtectedRouteProps {
  /** Необязательная проверка разрешений */
  permission?: Permission | Permission[];
  /** Необязательная проверка ролей */
  roles?: Role | Role[];
  children: ReactNode;
}

/**
 * Обёртка для защиты роутов.
 * Проверяет аутентификацию, роли и разрешения.
 * Перенаправляет на /login если не аутентифицирован.
 */
export function ProtectedRoute({ permission, roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasPermission, hasAnyRole } = useAuthStore();

  // Загрузка — показываем спиннер
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Не аутентифицирован — редирект на логин
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Проверка разрешений
  if (permission) {
    const hasAccess = Array.isArray(permission)
      ? permission.every((p) => hasPermission(p))
      : hasPermission(permission);

    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  // Проверка ролей
  if (roles) {
    const rolesList = Array.isArray(roles) ? roles : [roles];
    if (!hasAnyRole(rolesList)) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}

// ─── Пример использования в роутере ───────────────────────────
//
// <Routes>
//   <Route path="/login" element={<LoginPage />} />
//
//   <Route path="/dashboard" element={
//     <ProtectedRoute>
//       <DashboardPage />
//     </ProtectedRoute>
//   } />
//
//   <Route path="/finance" element={
//     <ProtectedRoute permission={Permission.FINANCE_VIEW}>
//       <FinancePage />
//     </ProtectedRoute>
//   } />
//
//   <Route path="/settings" element={
//     <ProtectedRoute roles={[Role.OWNER, Role.ADMIN]}>
//       <SettingsPage />
//     </ProtectedRoute>
//   } />
// </Routes>
```

---

## Переменные окружения

```bash
# .env — секреты JWT и настройки токенов
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_TEMP_SECRET=your-temp-secret-for-2fa
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

---

## Ссылки

- `src/modules/auth/` — бэкенд-модуль аутентификации (NestJS)
- `src/stores/auth.store.ts` — Zustand-стор аутентификации (фронтенд)
- `src/hooks/useAuth.ts` — React-хук аутентификации
- `src/components/auth/` — PermissionGate, ProtectedRoute (фронтенд)
