import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { SystemService } from './system.service';
import { CreateSystemEventDto } from './dto/create-system-event.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import {Role, SystemEventType} from "@prisma/client";

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('events')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a system event' })
  @ApiResponse({ status: 201, description: 'System event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createEvent(@Body() createSystemEventDto: CreateSystemEventDto) {
    return this.systemService.createSystemEvent(createSystemEventDto);
  }

  @Get('events')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all system events' })
  @ApiQuery({ name: 'type', required: false, enum: SystemEventType, description: 'Filter by event type' })
  @ApiQuery({ name: 'source', required: false, type: String, description: 'Filter by event source' })
  @ApiQuery({ name: 'startDate', required: false, type: Date, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, type: Date, description: 'Filter by end date' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'System events retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllEvents(
      @Query('type') type?: SystemEventType,
      @Query('source') source?: string,
      @Query('startDate') startDate?: Date,
      @Query('endDate') endDate?: Date,
      @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.systemService.getAllEvents(type, source, startDate, endDate, limit);
  }

  @Get('events/summary')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get system event summary for dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of recent events' })
  @ApiResponse({ status: 200, description: 'Event summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getEventSummary(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.systemService.getEventSummary(limit);
  }

  @Get('events/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get system event by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'System event retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'System event not found' })
  async getEventById(@Param('id', ParseIntPipe) id: number) {
    return this.systemService.getEventById(id);
  }

  @Delete('events/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete system event by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'System event deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteEvent(@Param('id', ParseIntPipe) id: number) {
    await this.systemService.deleteEvent(id);
    return { message: 'System event deleted successfully' };
  }

  @Get('health')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getSystemHealth() {
    return this.systemService.getSystemHealth();
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get system usage statistics' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month'], description: 'Time range for statistics' })
  @ApiResponse({ status: 200, description: 'System statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getSystemStatistics(
      @Query('timeRange') timeRange?: 'day' | 'week' | 'month',
  ) {
    return this.systemService.getSystemStatistics(timeRange);
  }

  @Delete('events/cleanup/old')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Clean up old system events' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number, description: 'Number of days to keep events' })
  @ApiResponse({ status: 200, description: 'Old events cleaned up successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cleanupOldEvents(
      @Query('daysToKeep', new ParseIntPipe({ optional: true })) daysToKeep?: number,
  ) {
    return this.systemService.cleanupOldEvents(daysToKeep);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get comprehensive dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDashboardData() {
    const [health, statistics, eventSummary] = await Promise.all([
      this.systemService.getSystemHealth(),
      this.systemService.getSystemStatistics('day'),
      this.systemService.getEventSummary(20),
    ]);

    return {
      health,
      statistics,
      eventSummary,
      timestamp: new Date().toISOString(),
    };
  }
}