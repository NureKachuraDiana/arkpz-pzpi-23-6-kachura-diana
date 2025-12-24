import { Module } from '@nestjs/common';
import {NotificationTemplateService} from "./notification-template.service";
import {NotificationTemplateController} from "./notification-template.controller";

@Module({
  controllers: [NotificationTemplateController],
  providers: [NotificationTemplateService],
  exports: [NotificationTemplateService]
})
export class NotificationTemplateModule {}
