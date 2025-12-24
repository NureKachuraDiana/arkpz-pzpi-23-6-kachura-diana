import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsDate } from 'class-validator';
import { NotificationType, AlertSeverity } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
    @ApiProperty({ description: 'User ID to receive notification' })
    @IsInt()
    userId: number;

    @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({ description: 'Notification title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Notification message' })
    @IsString()
    message: string;

    @ApiPropertyOptional({ enum: AlertSeverity, description: 'Priority level' })
    @IsEnum(AlertSeverity)
    @IsOptional()
    priority?: AlertSeverity;

    @ApiPropertyOptional({ description: 'Expiration date' })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    expiresAt?: Date;
}