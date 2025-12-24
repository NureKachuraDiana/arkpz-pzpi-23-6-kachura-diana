import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsBoolean, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationTemplateDto {
    @ApiProperty({ enum: NotificationType, description: 'Type of notification template' })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({ description: 'Language code', default: 'uk' })
    @IsString()
    language: string = 'uk';

    @ApiProperty({ description: 'Template title with variables like {{userName}}' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Template message with variables like {{userName}}' })
    @IsString()
    message: string;

    @ApiProperty({ description: 'Is template active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;
}
