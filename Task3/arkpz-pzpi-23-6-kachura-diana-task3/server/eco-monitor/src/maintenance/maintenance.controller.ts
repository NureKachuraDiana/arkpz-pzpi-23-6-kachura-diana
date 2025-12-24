import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';
import { UpdateMaintenanceScheduleDto } from './dto/update-maintenance-schedule.dto';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import {MaintenanceSchedule, Role} from '@prisma/client';
import {MaintenanceSchedulesService} from "./maintenance.service";
import {Roles} from "../auth/decorators/roles.decorator";

@ApiTags('maintenance-schedules')
@Controller('maintenance-schedules')
export class MaintenanceSchedulesController {
  constructor(private readonly maintenanceSchedulesService: MaintenanceSchedulesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new maintenance schedule' })
  @ApiResponse({ status: 201, description: 'Maintenance schedule created successfully' })
  async create(@Body() createMaintenanceScheduleDto: CreateMaintenanceScheduleDto): Promise<MaintenanceSchedule> {
    return this.maintenanceSchedulesService.create(createMaintenanceScheduleDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Get all maintenance schedules with filtering' })
  @ApiResponse({ status: 200, description: 'Returns maintenance schedules with pagination' })
  async findAll() {
    return this.maintenanceSchedulesService.findAll();
  }

  @Roles(Role.OPERATOR, Role.ADMIN)
  @Get('upcoming/:userId')
  @ApiOperation({ summary: 'Get upcoming maintenance for user' })
  @ApiResponse({ status: 200, description: 'Returns upcoming maintenance for user' })
  async getUpcomingForUser(
      @Param('userId') userId: string,
      @Query('days') days: string,
  ) {
    return this.maintenanceSchedulesService.getUpcomingForUser(
        parseInt(userId),
        days ? parseInt(days) : 7
    );
  }


  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Get maintenance schedule by ID' })
  @ApiResponse({ status: 200, description: 'Returns maintenance schedule' })
  @ApiResponse({ status: 404, description: 'Maintenance schedule not found' })
  async findOne(@Param('id') id: string): Promise<MaintenanceSchedule> {
    return this.maintenanceSchedulesService.findOne(parseInt(id));
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Put(':id')
  @ApiOperation({ summary: 'Update maintenance schedule' })
  @ApiResponse({ status: 200, description: 'Maintenance schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance schedule not found' })
  async update(
      @Param('id') id: string,
      @Body() updateMaintenanceScheduleDto: UpdateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceSchedulesService.update(parseInt(id), updateMaintenanceScheduleDto);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete maintenance schedule' })
  @ApiResponse({ status: 204, description: 'Maintenance schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance schedule not found' })
  async remove(
      @Param('id') id: string): Promise<void> {
    return this.maintenanceSchedulesService.remove(parseInt(id));
  }

  @Roles(Role.OPERATOR, Role.ADMIN)
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign maintenance to user' })
  @ApiResponse({ status: 200, description: 'Maintenance assigned successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance or user not found' })
  async assign(
      @Param('id', ParseIntPipe) id: number,
      @Body() assignDto: AssignMaintenanceDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceSchedulesService.assign(id, assignDto);
  }

  @Roles(Role.OPERATOR, Role.ADMIN)
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark maintenance as completed' })
  @ApiResponse({ status: 200, description: 'Maintenance marked as completed' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  async complete(
      @Param('id', ParseIntPipe) id: number,
      @Body() completeDto: CompleteMaintenanceDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceSchedulesService.complete(id, completeDto);
  }

  @Roles(Role.OPERATOR, Role.ADMIN)
  @Post('check-upcoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check and send notifications for upcoming maintenance' })
  @ApiResponse({ status: 200, description: 'Upcoming maintenance checked' })
  async checkUpcomingMaintenance(): Promise<{ message: string }> {
    await this.maintenanceSchedulesService.checkUpcomingMaintenance();
    return { message: 'Upcoming maintenance checked successfully' };
  }
}
