import { Module } from '@nestjs/common';
import { SensorReadingsService } from './sensor-readings.service';
import { SensorReadingsController } from './sensor-readings.controller';
import {ThresholdModule} from "../threshold/threshold.module";
import {StationAlertModule} from "../station-alert/station-alert.module";
import {AuthModule} from "../auth/auth.module";

@Module({
  controllers: [SensorReadingsController],
  providers: [SensorReadingsService],
  exports: [SensorReadingsService],
  imports: [ThresholdModule, StationAlertModule, AuthModule]
})
export class SensorReadingsModule {}
