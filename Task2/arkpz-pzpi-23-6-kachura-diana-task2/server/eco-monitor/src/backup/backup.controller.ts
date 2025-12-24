import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  StreamableFile,
  Response,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import type { Response as ExpressResponse } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {BackupStatus, Role} from "@prisma/client";
import {Roles} from "../auth/decorators/roles.decorator";

@ApiTags('backups')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new backup' })
  @ApiResponse({ status: 201, description: 'Backup initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid backup type' })
  @ApiResponse({ status: 500, description: 'Failed to create backup' })
  async createBackup(@Body() createBackupDto: CreateBackupDto) {
    const { type = 'database', description } = createBackupDto;

    if (type && !['database', 'full'].includes(type)) {
      throw new BadRequestException('Invalid backup type. Must be "database" or "full"');
    }

    return this.backupService.createBackup(type as 'database' | 'full', description);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get list of all backups' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BackupStatus,
    description: 'Filter by backup status'
  })
  async listBackups(
      @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
      @Query('take', new ParseIntPipe({ optional: true })) take?: number,
      @Query('status') status?: BackupStatus,
  ) {
    return this.backupService.listBackups(skip, take, status);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get backup details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async getBackup(@Param('id', ParseIntPipe) id: number) {
    return this.backupService.getBackup(id);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Download backup file' })
  @ApiParam({ name: 'id', type: Number, description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup file downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Backup file not found' })
  async downloadBackup(
      @Param('id', ParseIntPipe) id: number,
      @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { stream, fileName } = await this.backupService.getBackupFileStream(id);

    // Set response headers for file download
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete backup by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async deleteBackup(@Param('id', ParseIntPipe) id: number) {
    await this.backupService.deleteBackup(id);
    return { message: 'Backup deleted successfully' };
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel an in-progress backup' })
  @ApiParam({ name: 'id', type: Number, description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel backup with current status' })
  async cancelBackup(@Param('id', ParseIntPipe) id: number) {
    return this.backupService.cancelBackup(id);
  }

  @Get('stats/summary')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get backup statistics summary' })
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }
}