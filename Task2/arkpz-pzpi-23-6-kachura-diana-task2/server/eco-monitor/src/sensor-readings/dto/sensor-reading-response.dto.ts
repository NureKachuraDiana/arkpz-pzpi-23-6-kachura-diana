import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SensorType, AlertSeverity } from '@prisma/client';

export class ThresholdViolationDto {
    @ApiProperty()
    thresholdId: number;

    @ApiProperty({ enum: AlertSeverity })
    severity: AlertSeverity;

    @ApiProperty({ nullable: true })
    minValue: number | null;

    @ApiProperty({ nullable: true })
    maxValue: number | null;

    @ApiProperty({ nullable: true })
    description: string | null;

    @ApiProperty()
    actualValue: number;

    @ApiProperty()
    sensorType: SensorType;
}

export class StationDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    // Add other station properties as needed
}

export class SensorDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    serialNumber: string;

    @ApiProperty({ enum: SensorType })
    type: SensorType;

    @ApiProperty()
    name: string;

    @ApiProperty()
    station: StationDto;
}

export class SensorReadingResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    sensorId: number;

    @ApiProperty()
    value: number;

    @ApiProperty({ nullable: true })
    unit: string | null;

    @ApiProperty()
    timestamp: Date;

    @ApiProperty({ nullable: true })
    quality: number | null;

    @ApiProperty()
    sensor: SensorDto;

    @ApiPropertyOptional({ type: [ThresholdViolationDto] })
    thresholdViolations?: ThresholdViolationDto[];
}