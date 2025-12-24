import { Module } from '@nestjs/common';
import {MaintenanceSchedulesController} from "./maintenance.controller";
import {MaintenanceSchedulesService} from "./maintenance.service";
import {NotificationsModule} from "../notifications/notifications.module";

@Module({
  controllers: [MaintenanceSchedulesController],
  providers: [MaintenanceSchedulesService],
  imports: [NotificationsModule]
})
export class MaintenanceModule {}
