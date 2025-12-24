import { Module } from '@nestjs/common';
import { MonitoringStationService } from './monitoring-station.service';
import { MonitoringStationController } from './monitoring-station.controller';
import {PrismaService} from "../prisma/prisma.service";

@Module({
  controllers: [MonitoringStationController],
  providers: [MonitoringStationService],
  imports: [
  ],
    exports: [MonitoringStationService]
})
export class MonitoringStationModule {}
