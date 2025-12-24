import { Module } from '@nestjs/common';
import { StationAlertService } from './station-alert.service';
import { StationAlertController } from './station-alert.controller';
import {SessionModule} from "../session/session.module";

@Module({
  controllers: [StationAlertController],
  providers: [StationAlertService],
  exports: [StationAlertService],
  imports: [SessionModule]
})
export class StationAlertModule {}
