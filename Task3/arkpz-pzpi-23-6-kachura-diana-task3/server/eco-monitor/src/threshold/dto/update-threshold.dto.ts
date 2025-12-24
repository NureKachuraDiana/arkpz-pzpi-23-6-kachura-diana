import { PartialType } from '@nestjs/swagger';
import { CreateThresholdDto } from './create-threshold.dto';

export class UpdateThresholdDto extends PartialType(CreateThresholdDto) {}
