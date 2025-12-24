import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config'
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SessionService } from './session/session.service';
import { SessionModule } from './session/session.module';
import { SettingsModule } from './settings/settings.module';
import { MonitoringStationModule } from './monitoring-station/monitoring-station.module';
import { UnitConversionService } from './unit-conversion/unit-conversion.service';
import { UnitConversionModule } from './unit-conversion/unit-conversion.module';
import { MonitoringStationStatsService } from './monitoring-station-stats/monitoring-station-stats.service';
import { MonitoringStationStatsModule } from './monitoring-station-stats/monitoring-station-stats.module';
import { SensorModule } from './sensor/sensor.module';
import { ThresholdModule } from './threshold/threshold.module';
import { SensorReadingsModule } from './sensor-readings/sensor-readings.module';
import { DataExportModule } from './data-export/data-export.module';
import { StationAlertModule } from './station-alert/station-alert.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NotificationTemplateModule } from './notification-template/notification-template.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { BackupModule } from './backup/backup.module';
import { UserActivityLogModule } from './user-activity-log/user-activity-log.module';
import { SystemModule } from './system/system.module';
import * as process from "process";

@Module({
  imports: [
      ConfigModule.forRoot({
          envFilePath: `.${process.env.NODE_ENV}.env`,
          isGlobal: true,
      }),
      UserModule,
      PrismaModule,
      AuthModule,
      SessionModule,
      SettingsModule,
      MonitoringStationModule,
      UnitConversionModule,
      MonitoringStationStatsModule,
      SensorModule,
      ThresholdModule,
      SensorReadingsModule,
      DataExportModule,
      StationAlertModule,
      NotificationsModule,
      NotificationTemplateModule,
      MaintenanceModule,
      BackupModule,
      UserActivityLogModule,
      SystemModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, SessionService, UnitConversionService, MonitoringStationStatsService],
})
export class AppModule {}
