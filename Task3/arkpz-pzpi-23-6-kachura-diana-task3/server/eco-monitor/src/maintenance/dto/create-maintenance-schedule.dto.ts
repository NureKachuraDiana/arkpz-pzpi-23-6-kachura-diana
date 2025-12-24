import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsDate, IsBoolean } from 'class-validator';
import { MaintenanceScheduleType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateMaintenanceScheduleDto {
    @ApiPropertyOptional({ description: 'Station ID' })
    @IsInt()
    @IsOptional()
    stationId?: number;

    @ApiPropertyOptional({ description: 'Sensor ID' })
    @IsInt()
    @IsOptional()
    sensorId?: number;

    @ApiProperty({ description: 'Maintenance title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Maintenance description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: MaintenanceScheduleType, description: 'Schedule type' })
    @IsEnum(MaintenanceScheduleType)
    scheduleType: MaintenanceScheduleType;

    @ApiProperty({ description: 'Start date' })
    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @ApiPropertyOptional({ description: 'End date' })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endDate?: Date;

    @ApiPropertyOptional({ description: 'User ID assigned to maintenance' })
    @IsInt()
    @IsOptional()
    assignedTo?: number;

    @ApiPropertyOptional({ description: 'Is completed', default: false })
    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean = false;
}