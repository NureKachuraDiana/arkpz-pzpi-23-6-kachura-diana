import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {SensorType} from "@prisma/client";

export class CreateSensorDto {
    @ApiProperty({
        description: 'The ID of the monitoring station this sensor belongs to.',
        example: 1,
    })
    @IsInt()
    @IsNotEmpty()
    stationId: number;

    @ApiProperty({
        description: 'The type of sensor.',
        enum: SensorType,
        example: SensorType.TEMPERATURE,
    })
    @IsEnum(SensorType)
    @IsNotEmpty()
    type: SensorType;

    @ApiProperty({
        description: 'The friendly name of the sensor (e.g., "North Roof Temp").',
        example: 'Main CO2 Sensor',
        maxLength: 100,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'The unique serial number of the sensor.',
        example: 'SN-001A-2023',
    })
    @IsString()
    @IsNotEmpty()
    serialNumber: string;

    @ApiProperty({
        description: 'The model or manufacturer of the sensor.',
        example: 'Model XYZ',
        required: false,
    })
    @IsOptional()
    @IsString()
    model?: string;
}