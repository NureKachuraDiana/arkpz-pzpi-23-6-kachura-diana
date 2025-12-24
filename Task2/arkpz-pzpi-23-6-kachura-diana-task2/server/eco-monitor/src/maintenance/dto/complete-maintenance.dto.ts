import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteMaintenanceDto {
    @ApiPropertyOptional({ description: 'Completion notes' })
    @IsString()
    @IsOptional()
    notes?: string;
}