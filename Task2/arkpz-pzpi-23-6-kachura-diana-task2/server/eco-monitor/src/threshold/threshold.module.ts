import { Module } from '@nestjs/common';
import { ThresholdService } from './threshold.service';
import { ThresholdController } from './threshold.controller';

@Module({
  controllers: [ThresholdController],
  providers: [ThresholdService],
  exports: [ThresholdService]
})
export class ThresholdModule {}
