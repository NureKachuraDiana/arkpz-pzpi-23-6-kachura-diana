import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsISO8601, Min, Max } from 'class-validator';

export class CreateSensorReadingDto {
    @ApiProperty({
        description: 'Serial number of the sensor',
        example: 'SENSOR-12345'
    })
    @IsString()
    sensorSerialNumber: string;

    @ApiProperty({ description: 'Reading value from sensor' })
    @IsNumber()
    value: number;

    @ApiPropertyOptional({ description: 'Measurement unit (e.g., °C, ppm, %)' })
    @IsString()
    @IsOptional()
    unit?: string;

    @ApiPropertyOptional({ description: 'Timestamp of the reading (ISO 8601 format)' })
    @IsISO8601()
    @IsOptional()
    timestamp?: Date;

    @ApiPropertyOptional({
        description: 'Data quality indicator between 0 and 1',
        minimum: 0,
        maximum: 1
    })
    @IsNumber()
    @Min(0)
    @Max(1)
    @IsOptional()
    quality?: number;
}