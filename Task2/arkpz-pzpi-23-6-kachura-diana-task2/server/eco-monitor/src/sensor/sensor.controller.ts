import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, Query, Put } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {Roles} from "../auth/decorators/roles.decorator";
import {Role, SensorType} from "@prisma/client";

@ApiTags('Sensors')
@Controller('sensors')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post()
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new sensor' })
  @ApiResponse({ status: 201, description: 'The sensor has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorService.create(createSensorDto);
  }

  @Get('station/:stationId')
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Get all sensors for a specific station' })
  @ApiParam({ name: 'stationId', type: Number, description: 'ID of the monitoring station' })
  async findInStation(@Param('stationId', ParseIntPipe) stationId: number) {
    return this.sensorService.findInStation(stationId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all sensors' })
  async getAll() {
    return this.sensorService.getAll();
  }

  @Get('type/:type')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all sensors of a specific type' })
  @ApiParam({ name: 'type', enum: SensorType, description: 'The type of sensor' })
  async getTypeSensors(@Param('type') type: SensorType) {
    return this.sensorService.getTypeSensors(type);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Set a sensor as active' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async setActive(@Param('id', ParseIntPipe) sensorId: number) {
    return this.sensorService.setActive(sensorId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Set a sensor as inactive' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async setInactive(@Param('id', ParseIntPipe) sensorId: number) {
    return this.sensorService.setInactive(sensorId);
  }

  @Put(':id/calibrate')
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Update the calibration date to now' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async sensorCalibration(@Param('id', ParseIntPipe) sensorId: number) {
    return this.sensorService.sensorCalibration(sensorId);
  }

  @Get(':id/status/latest')
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Get the last recorded status for a sensor' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async getSensorStatus(@Param('id', ParseIntPipe) sensorId: number) {
    return this.sensorService.getSensorStatus(sensorId);
  }

  @Get(':id/status/history')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Get all status history for a sensor' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async getSensorStatusHistory(@Param('id', ParseIntPipe) sensorId: number) {
    return this.sensorService.getSensorStatusHistory(sensorId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Get a single sensor by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sensorService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update an existing sensor' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the sensor' })
  @ApiBody({ type: UpdateSensorDto })
  async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateSensorDto: UpdateSensorDto,
  ) {
    return this.sensorService.update(id, updateSensorDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sensor by ID' })
  @ApiResponse({ status: 204, description: 'Sensor successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Sensor not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.sensorService.remove(id);
  }
}
