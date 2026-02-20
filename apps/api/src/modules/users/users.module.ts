import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import {
  User,
  UserSession,
  TwoFactorAuth,
  PasswordResetToken,
  LoginAttempt,
  AccessRequest,
} from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSession,
      TwoFactorAuth,
      PasswordResetToken,
      LoginAttempt,
      AccessRequest,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
