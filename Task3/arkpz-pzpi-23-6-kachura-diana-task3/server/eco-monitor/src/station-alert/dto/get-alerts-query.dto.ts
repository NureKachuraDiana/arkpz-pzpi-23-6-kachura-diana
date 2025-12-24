import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsBoolean, IsISO8601, IsOptional, Min, Max } from 'class-validator';
import { SensorType, AlertSeverity } from '@prisma/client';
import { Type } from 'class-transformer';

export class GetAlertsQueryDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    stationId?: number;

    @ApiProperty({ enum: SensorType, required: false })
    @IsOptional()
    @IsEnum(SensorType)
    sensorType?: SensorType;

    @ApiProperty({ enum: AlertSeverity, required: false })
    @IsOptional()
    @IsEnum(AlertSeverity)
    severity?: AlertSeverity;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isActive?: boolean;

    @ApiProperty({ required: false, description: 'Start date for filtering (ISO string)' })
    @IsOptional()
    @IsISO8601()
    from?: string;

    @ApiProperty({ required: false, description: 'End date for filtering (ISO string)' })
    @IsOptional()
    @IsISO8601()
    to?: string;

    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;

    @ApiProperty({ enum: ['asc', 'desc'], required: false, default: 'desc' })
    @IsOptional()
    sort?: 'asc' | 'desc' = 'desc';
}