import { Module } from '@nestjs/common';
import { MonitoringStationStatsController } from './monitoring-station-stats.controller';
import {UnitConversionModule} from "../unit-conversion/unit-conversion.module";
import {PrismaModule} from "../prisma/prisma.module";
import {SettingsModule} from "../settings/settings.module";
import {MonitoringStationStatsService} from "./monitoring-station-stats.service";

@Module({
  controllers: [MonitoringStationStatsController],
  imports: [UnitConversionModule, SettingsModule],
  exports: [MonitoringStationStatsService],
  providers: [MonitoringStationStatsService]
})
export class MonitoringStationStatsModule {}
