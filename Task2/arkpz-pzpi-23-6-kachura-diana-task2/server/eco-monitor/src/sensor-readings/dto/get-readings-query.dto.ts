import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601, IsEnum, IsNumber } from 'class-validator';
import { SensorType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class GetReadingsQueryDto {
    @ApiPropertyOptional({
        description: 'Serial number of the sensor',
        example: 'SENSOR-12345'
    })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => {
        console.log(`🔄 Transforming sensorSerialNumber:`, {
            input: value,
            type: typeof value
        });
        return value;
    })
    sensorSerialNumber?: string;

    @ApiPropertyOptional({ description: 'ID of the monitoring station' })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => {
        console.log(`🔄 Transforming stationId:`, {
            input: value,
            type: typeof value
        });
        return Number(value);
    })
    stationId?: number;

    @ApiPropertyOptional({
        description: 'Type of sensor',
        enum: SensorType
    })
    @IsEnum(SensorType)
    @IsOptional()
    sensorType?: SensorType;

    @ApiProperty({
        description: 'Start time for the period (ISO 8601 format)',
        example: '2024-01-01T00:00:00Z'
    })
    @IsISO8601()
    @Transform(({ value }) => {
        console.log(`🔄 Transforming startTime:`, {
            input: value,
            type: typeof value,
            date: new Date(value).toISOString()
        });
        return value;
    })
    startTime: string;

    @ApiProperty({
        description: 'End time for the period (ISO 8601 format)',
        example: '2024-01-02T00:00:00Z'
    })
    @IsISO8601()
    @Transform(({ value }) => {
        console.log(`🔄 Transforming endTime:`, {
            input: value,
            type: typeof value,
            date: new Date(value).toISOString()
        });
        return value;
    })
    endTime: string;
}