import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {SessionModule} from "../session/session.module";
import {JwtModule} from "@nestjs/jwt";
import {PrismaModule} from "../prisma/prisma.module";
import {UserModule} from "../user/user.module";
import {APP_GUARD} from "@nestjs/core";
import {RolesGuard} from "./guards/role.guard";
import {AuthGuard} from "./guards/auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30d' }, // 30 days to match session duration
    }),
    UserModule, SessionModule, ],
  exports: [AuthModule]
})
export class AuthModule {}
