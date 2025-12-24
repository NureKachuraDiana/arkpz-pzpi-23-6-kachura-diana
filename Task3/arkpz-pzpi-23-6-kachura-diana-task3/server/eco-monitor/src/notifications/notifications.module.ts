import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import {SettingsModule} from "../settings/settings.module";
import {SessionModule} from "../session/session.module";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  imports: [SettingsModule, SessionModule],
  exports: [NotificationsService]
})
export class NotificationsModule {}
