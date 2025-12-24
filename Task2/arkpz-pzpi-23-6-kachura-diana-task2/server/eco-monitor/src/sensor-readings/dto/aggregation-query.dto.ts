import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601, IsEnum, IsNumber } from 'class-validator';
import { SensorType } from '@prisma/client';

export class AggregationQueryDto {
    @ApiPropertyOptional({
        description: 'Serial number of the sensor',
        example: 'SENSOR-12345'
    })
    @IsString()
    @IsOptional()
    sensorSerialNumber?: string;

    @ApiPropertyOptional({ description: 'ID of the monitoring station' })
    @IsNumber()
    @IsOptional()
    stationId?: number;

    @ApiPropertyOptional({
        description: 'Type of sensor',
        enum: SensorType
    })
    @IsEnum(SensorType)
    @IsOptional()
    sensorType?: SensorType;

    @ApiProperty({
        description: 'Start time for aggregation period',
        example: '2024-01-01T00:00:00Z'
    })
    @IsISO8601()
    startTime: string;

    @ApiProperty({
        description: 'End time for aggregation period',
        example: '2024-01-02T00:00:00Z'
    })
    @IsISO8601()
    endTime: string;

    @ApiPropertyOptional({
        description: 'Aggregation interval in minutes',
        example: 60,
        default: 60
    })
    @IsNumber()
    @IsOptional()
    interval?: number = 60;
}