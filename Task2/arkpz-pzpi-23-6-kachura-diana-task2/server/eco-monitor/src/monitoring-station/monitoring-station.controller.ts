import {Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe} from '@nestjs/common';
import { MonitoringStationService } from './monitoring-station.service';
import { CreateMonitoringStationDto } from './dto/create-monitoring-station.dto';
import { UpdateMonitoringStationDto } from './dto/update-monitoring-station.dto';
import {Roles} from "../auth/decorators/roles.decorator";
import {GetMonitoringStationInRadiusDto} from "./dto/get-monitoring-station-in-radius.dto";
import {ApiOperation, ApiParam, ApiResponse, ApiTags} from "@nestjs/swagger";
import {Role} from "@prisma/client";
import {Public} from "../auth/decorators/public.decorator";

@ApiTags('Monitoring station')
@Controller('monitoring-station')
export class MonitoringStationController {
  constructor(private readonly monitoringStationService: MonitoringStationService) {}

  @Post()
  @Roles(Role.OPERATOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create monitoring station' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User not found' })
  async create(
      @Body() createMonitoringStationDto: CreateMonitoringStationDto
  ) {
    return this.monitoringStationService.create(createMonitoringStationDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all monitoring stations' })
  @ApiResponse({ status: 200 })
  async findAll() {
    console.log("MonitoringStationController: GET /monitoring-station called");
    const stations = await this.monitoringStationService.findAll();
    console.log(`MonitoringStationController: Returning ${stations.length} stations`);
    return stations;
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Monitoring station ID' })
  @ApiOperation({ summary: 'Get info about monitoring station' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Monitoring station not found' })
  async findOne(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.monitoringStationService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OPERATOR, Role.ADMIN)
  @ApiParam({ name: 'id', type: Number, description: 'Monitoring station ID' })
  @ApiOperation({ summary: 'Update info about monitoring station' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Monitoring station not found' })
  async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateMonitoringStationDto: UpdateMonitoringStationDto
  ) {
    return this.monitoringStationService.update(id, updateMonitoringStationDto);
  }

  @Delete(':id')
  @Roles(Role.OPERATOR, Role.ADMIN)
  @ApiParam({ name: 'id', type: Number, description: 'Monitoring station ID' })
  @ApiOperation({ summary: 'Remove info about monitoring station' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'Monitoring station not found' })
  async remove(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.monitoringStationService.remove(id);
  }

  @Patch('deactivate/:id')
  @Roles(Role.OPERATOR, Role.ADMIN)
  @ApiParam({ name: 'id', type: Number, description: 'Monitoring station ID' })
  @ApiOperation({ summary: 'Deactivate monitoring station' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'Monitoring station not found' })
  async deactivateStation(
      @Param('id', ParseIntPipe) id: number
  ){
    return this.monitoringStationService.deactivateStation(id)
  }

  @Patch('activate/:id')
  @Roles(Role.OPERATOR, Role.ADMIN)
  @ApiParam({ name: 'id', type: Number, description: 'Monitoring station ID' })
  @ApiOperation({ summary: 'Activate monitoring station' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'Monitoring station not found' })
  async activateStation(
      @Param('id', ParseIntPipe) id: number
  ){
    return this.monitoringStationService.activateStation(id)
  }

  @Get('radius')
  @Roles(Role.OBSERVER)
  @ApiOperation({ summary: 'Get monitoring stations list in a radius about point' })
  @ApiResponse({ status: 200 })
  async findInRadius(
      @Body() getMonitoringStationInRadiusDto: GetMonitoringStationInRadiusDto
  ){
    return this.monitoringStationService.findInRadius(getMonitoringStationInRadiusDto)
  }
}
