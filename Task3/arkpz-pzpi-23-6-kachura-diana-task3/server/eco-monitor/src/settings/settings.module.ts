import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import {SessionModule} from "../session/session.module";
import {PrismaModule} from "../prisma/prisma.module";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [
      SessionModule,
  ],
    exports: [
        SettingsService
    ]
})
export class SettingsModule {}
