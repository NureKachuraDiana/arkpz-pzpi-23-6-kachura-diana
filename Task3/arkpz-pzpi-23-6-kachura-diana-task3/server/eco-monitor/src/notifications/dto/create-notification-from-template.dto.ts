import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NotificationType, AlertSeverity } from '@prisma/client';

export class CreateNotificationFromTemplateDto {
    @ApiProperty({ description: 'User ID to receive notification' })
    @IsInt()
    userId: number;

    @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiPropertyOptional({ description: 'Language for template', default: 'uk' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ enum: AlertSeverity, description: 'Priority level' })
    @IsEnum(AlertSeverity)
    @IsOptional()
    priority?: AlertSeverity;

    @ApiPropertyOptional({ description: 'Template variables' })
    @IsOptional()
    variables?: Record<string, any>;
}