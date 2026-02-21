import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { UsersModule } from "../users/users.module";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { PasswordPolicyService } from "./services/password-policy.service";
import { CookieService } from "./services/cookie.service";
import { UserSession, PasswordResetToken } from "./entities/auth.entity";
import {
  User,
  TwoFactorAuth,
  LoginAttempt,
} from "../users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSession,
      PasswordResetToken,
      User,
      TwoFactorAuth,
      LoginAttempt,
    ]),
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN") || "15m",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenBlacklistService,
    PasswordPolicyService,
    CookieService,
  ],
  exports: [
    AuthService,
    JwtModule,
    TokenBlacklistService,
    PasswordPolicyService,
    CookieService,
  ],
})
export class AuthModule {}
