import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateUserActivityLogDto {
    @ApiProperty({
        description: 'User ID who performed the action',
        example: 1,
    })
    @IsInt()
    userId: number;

    @ApiProperty({
        description: 'Action performed by the user',
        example: 'LOGIN',
    })
    @IsString()
    action: string;

    @ApiPropertyOptional({
        description: 'Resource related to the action',
        example: '/api/auth/login',
        required: false,
    })
    @IsOptional()
    @IsString()
    resource?: string;

    @ApiPropertyOptional({
        description: 'User IP address',
        example: '192.168.1.1',
        required: false,
    })
    @IsOptional()
    @IsString()
    ipAddress?: string;

    @ApiPropertyOptional({
        description: 'User-Agent header',
        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        required: false,
    })
    @IsOptional()
    @IsString()
    userAgent?: string;

    @ApiPropertyOptional({
        description: 'Additional action metadata',
        example: { method: 'POST', statusCode: 200 },
        required: false,
    })
    @IsOptional()
    @IsObject()
    metadata?: Prisma.InputJsonValue;
}