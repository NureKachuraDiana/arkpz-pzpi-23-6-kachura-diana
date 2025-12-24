import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';
import { SensorType, AlertSeverity } from '@prisma/client';

export class CreateAlertInternalDto {
    @ApiProperty({ description: 'ID of the monitoring station' })
    @IsInt()
    stationId: number;

    @ApiProperty({ description: 'ID of the specific sensor (optional)', required: false })
    @IsOptional()
    @IsInt()
    sensorId?: number;

    @ApiProperty({ enum: SensorType, description: 'Type of sensor that triggered the alert' })
    @IsEnum(SensorType)
    sensorType: SensorType;

    @ApiProperty({ description: 'Current sensor value that exceeded threshold' })
    @IsNumber()
    value: number;

    @ApiProperty({ description: 'Threshold value that was exceeded' })
    @IsNumber()
    thresholdValue: number;

    @ApiProperty({ enum: AlertSeverity, description: 'Severity level of the alert' })
    @IsEnum(AlertSeverity)
    severity: AlertSeverity;

    @ApiProperty({
        description: 'Alert message describing the issue',
        required: false,
        default: 'Auto-generated based on sensor data'
    })
    @IsOptional()
    @IsString()
    message?: string;
}

