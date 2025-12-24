import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class CreateMonitoringStationDto {
    @ApiProperty({ example: 'Some name', required: true })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Some description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: '45.000493', required: true })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({ example: '-13.000493', required: true })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({ example: '100.5', required: false })
    @IsNumber()
    @IsOptional()
    altitude?: number;

    @ApiProperty({ example: 'Some address', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'true', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
