import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { SensorType, AlertSeverity } from '@prisma/client';
import {ApiProperty} from "@nestjs/swagger";

export class CreateThresholdDto {
    @IsEnum(SensorType)
    @ApiProperty({
        description: 'The type of sensor.',
        enum: SensorType,
        example: SensorType.TEMPERATURE,
    })
    sensorType: SensorType;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        description: 'The min value of sensor readings with specified type',
        example: 1,
    })
    minValue?: number;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        description: 'The max value of sensor readings with specified type',
        example: 1,
    })
    maxValue?: number;

    @IsEnum(AlertSeverity)
    @ApiProperty({
        description: 'Monitoring station alert severity.',
        enum: AlertSeverity,
        example: AlertSeverity.CRITICAL,
    })
    severity: AlertSeverity;

    @IsString()
    @IsOptional()
    @ApiProperty({
        description: 'Threshold description.',
        example: 'Main CO2 Sensor readings threshold',
        maxLength: 100,
    })
    description?: string;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description: 'Sensor threshold activity (true or false)',
        example: true,
    })
    isActive?: boolean;
}
