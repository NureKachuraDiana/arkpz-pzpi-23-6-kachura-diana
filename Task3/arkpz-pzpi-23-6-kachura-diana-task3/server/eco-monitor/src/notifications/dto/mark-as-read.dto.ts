import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class MarkAsReadDto {
    @ApiPropertyOptional({
        description: 'Specific notification IDs to mark as read. If empty, marks all as read',
        type: [Number]
    })
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    notificationIds?: number[];
}