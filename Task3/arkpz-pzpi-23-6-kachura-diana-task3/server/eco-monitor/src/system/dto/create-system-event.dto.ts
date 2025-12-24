import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsInt, IsObject } from 'class-validator';
import {SystemEventType} from "@prisma/client";

export class CreateSystemEventDto {
    @ApiProperty({
        description: 'Type of system event',
        enum: SystemEventType,
        example: SystemEventType.ERROR,
    })
    @IsEnum(SystemEventType)
    type: SystemEventType;

    @ApiProperty({
        description: 'Event message',
        example: 'Database connection failed',
    })
    @IsString()
    message: string;

    @ApiPropertyOptional({
        description: 'Source of the event',
        example: 'database_service',
        required: false,
    })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional({
        description: 'Additional event details',
        example: { errorCode: 'DB_001', retryCount: 3 },
        required: false,
    })
    @IsOptional()
    @IsObject()
    details?: any;

    @ApiPropertyOptional({
        description: 'User ID who triggered the event',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    createdBy?: number;
}

export class CreateSystemEventFromServiceDto {
    @ApiProperty({
        description: 'Type of system event',
        enum: SystemEventType,
        example: SystemEventType.ERROR,
    })
    @IsEnum(SystemEventType)
    type: SystemEventType;

    @ApiProperty({
        description: 'Event message',
        example: 'Database connection failed',
    })
    @IsString()
    message: string;

    @ApiPropertyOptional({
        description: 'Source of the event',
        example: 'database_service',
        required: false,
    })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional({
        description: 'Additional event details',
        example: { errorCode: 'DB_001', retryCount: 3 },
        required: false,
    })
    @IsOptional()
    @IsObject()
    details?: any;
}