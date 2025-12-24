import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import {PrismaModule} from "../prisma/prisma.module";

@Module({
  controllers: [SensorController],
  providers: [SensorService],
  imports: [PrismaModule]
})
export class SensorModule {}
