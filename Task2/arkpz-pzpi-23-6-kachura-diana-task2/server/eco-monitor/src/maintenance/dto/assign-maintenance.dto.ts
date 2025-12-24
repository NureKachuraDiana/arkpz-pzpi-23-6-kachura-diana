import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignMaintenanceDto {
    @ApiProperty({ description: 'User ID to assign maintenance to' })
    @IsInt()
    assignedTo: number;
}