import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma/prisma.service';
import {SessionModule} from "../session/session.module";
import {SettingsModule} from "../settings/settings.module";

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
  imports: [
      SessionModule, SettingsModule
  ]
})
export class UserModule {}
