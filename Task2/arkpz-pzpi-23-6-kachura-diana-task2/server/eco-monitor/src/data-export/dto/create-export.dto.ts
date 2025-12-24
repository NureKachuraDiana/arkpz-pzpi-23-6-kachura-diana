import { IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportFormat } from '@prisma/client';
import { ExportFilterDto } from './export-filter.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExportDto {
    @ApiProperty({ enum: ExportFormat, description: 'Export file format' })
    @IsEnum(ExportFormat)
    format: ExportFormat;

    @ApiProperty({ type: ExportFilterDto, description: 'Data filters for export' })
    @IsObject()
    @ValidateNested()
    @Type(() => ExportFilterDto)
    filters: ExportFilterDto;

    @ApiProperty({ required: false, description: 'Export description' })
    @IsString()
    @IsOptional()
    description?: string;
}