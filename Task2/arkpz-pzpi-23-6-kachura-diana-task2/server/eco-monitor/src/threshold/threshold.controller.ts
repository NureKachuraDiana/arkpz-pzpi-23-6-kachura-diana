import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus, HttpCode
} from '@nestjs/common';
import { ThresholdService } from './threshold.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import {Role, SensorType} from '@prisma/client';
import {ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags} from "@nestjs/swagger";
import {Roles} from "../auth/decorators/roles.decorator";
import {UpdateSensorDto} from "../sensor/dto/update-sensor.dto";

@ApiTags('Threshold')
@Controller('threshold')
export class ThresholdController {
  constructor(private readonly thresholdService: ThresholdService) {}

  @Post()
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new threshold' })
  @ApiResponse({ status: 201, description: 'The threshold has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(
      @Body() createThresholdDto: CreateThresholdDto
  ) {
    return this.thresholdService.create(createThresholdDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all thresholds' })
  findAll() {
    return this.thresholdService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Get a single threshold by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the threshold' })
  findOne(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.thresholdService.findOne(id);
  }

  @Get('sensor-type/:sensorType')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all thresholds of a specific sensor type' })
  @ApiParam({ name: 'sensorType', enum: SensorType, description: 'The type of sensor' })
  findBySensorType(
      @Param('sensorType') sensorType: SensorType
  ) {
    return this.thresholdService.findBySensorType(sensorType);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update an existing threshold' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the threshold' })
  @ApiBody({ type: UpdateSensorDto })
  update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateThresholdDto: UpdateThresholdDto
  ) {
    return this.thresholdService.update(id, updateThresholdDto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Set a Threshold as active' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the threshold' })
  activate(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.thresholdService.activateThreshold(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Set a Threshold as inactive' })
  @ApiParam({ name: 'id', type: Number, description: 'ID of the threshold' })
  deactivate(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.thresholdService.deactivateThreshold(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a threshold by ID' })
  @ApiResponse({ status: 204, description: 'Threshold successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Threshold not found.' })
  remove(
      @Param('id', ParseIntPipe) id: number
  ) {
    return this.thresholdService.remove(id);
  }

  // Additional endpoint for sensor reading validation
  @Post('validate-reading/:sensorType')
  validateReading(
      @Param('sensorType') sensorType: SensorType,
      @Body('value', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) value: number,
  ) {
    return this.thresholdService.validateSensorReading(sensorType, value);
  }
}
