import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { SensorType, AlertSeverity } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExportFilterDto {
    @ApiProperty({ required: false, description: 'Start date for data range' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({ required: false, description: 'End date for data range' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ enum: SensorType, isArray: true, required: false })
    @IsEnum(SensorType, { each: true })
    @IsArray()
    @IsOptional()
    sensorTypes?: SensorType[];

    @ApiProperty({ required: false, description: 'Station IDs to filter by' })
    @IsArray()
    @IsOptional()
    @Type(() => Number)
    stationIds?: number[];

    @ApiProperty({ enum: AlertSeverity, required: false })
    @IsEnum(AlertSeverity)
    @IsOptional()
    severity?: AlertSeverity;

    @ApiProperty({ required: false, default: true })
    @IsBoolean()
    @IsOptional()
    includeReadings?: boolean = true;

    @ApiProperty({ required: false, default: true })
    @IsBoolean()
    @IsOptional()
    includeAlerts?: boolean = true;

    @ApiProperty({ required: false, default: false })
    @IsBoolean()
    @IsOptional()
    includeAggregated?: boolean = false;

    @ApiProperty({ required: false, description: 'Limit number of records' })
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number;
}