import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UserActivityLogService } from './user-activity-log.service';
import { CreateUserActivityLogDto } from './dto/create-user-activity-log.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import {Role} from "@prisma/client";

@ApiTags('user-activity-logs')
@Controller('user-activity-logs')
export class UserActivityLogController {
  constructor(private readonly userActivityLogService: UserActivityLogService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a user activity log' })
  @ApiResponse({ status: 201, description: 'User activity log created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
      @Body() createUserActivityLogDto: CreateUserActivityLogDto
  ) {
    return this.userActivityLogService.createLog(createUserActivityLogDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all user activity logs' })
  @ApiResponse({ status: 200, description: 'All user activity logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAll() {
    return this.userActivityLogService.getAllLogs();
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user activity logs by user ID' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activity logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUserLogs(@Param('userId', ParseIntPipe) userId: number) {
    return this.userActivityLogService.getUserLogs(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user activity log by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Log ID' })
  @ApiResponse({ status: 200, description: 'User activity log retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User activity log not found' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.userActivityLogService.getLogById(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user activity log by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Log ID' })
  @ApiResponse({ status: 200, description: 'User activity log deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userActivityLogService.deleteLog(id);
    return { message: 'User activity log deleted successfully' };
  }

  @Delete('cleanup/old')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Clean up old user activity logs' })
  @ApiResponse({ status: 200, description: 'Old logs cleaned up successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cleanupOldLogs() {
    return this.userActivityLogService.cleanupOldLogs();
  }
}