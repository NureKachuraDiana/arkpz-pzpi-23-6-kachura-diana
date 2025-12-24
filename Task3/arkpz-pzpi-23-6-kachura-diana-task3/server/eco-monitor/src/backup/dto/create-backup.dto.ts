import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBackupDto {
    @ApiProperty({
        description: 'Optional description for the backup',
        required: false,
        example: 'Daily backup before deployment',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Type of backup: database or full (database + files)',
        enum: ['database', 'full'],
        default: 'database',
        required: false,
    })
    @IsOptional()
    @IsString()
    type?: 'database' | 'full';
}