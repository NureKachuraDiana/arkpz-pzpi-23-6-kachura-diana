import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsBoolean, IsOptional } from 'class-validator';

export class ClearHistoryDto {
    @ApiProperty({
        required: false,
        description: 'Delete alerts older than this date (ISO string)'
    })
    @IsOptional()
    @IsISO8601()
    olderThan?: string;

    @ApiProperty({
        required: false,
        description: 'Only delete resolved alerts'
    })
    @IsOptional()
    @IsBoolean()
    resolved?: boolean;
}

