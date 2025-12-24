import { PartialType } from '@nestjs/mapped-types';
import { CreateMonitoringStationDto } from './create-monitoring-station.dto';

export class UpdateMonitoringStationDto extends PartialType(CreateMonitoringStationDto) {}
