import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SensorReadingsService } from './sensor-readings.service';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { GetReadingsQueryDto } from './dto/get-readings-query.dto';
import { AggregationQueryDto } from './dto/aggregation-query.dto';
import { SensorReadingResponseDto } from './dto/sensor-reading-response.dto';
import {Public} from "../auth/decorators/public.decorator";

@ApiTags('sensor-readings')
@Controller('sensor-readings')
export class SensorReadingsController {
  private readonly logger = new Logger(SensorReadingsController.name);

  constructor(private readonly sensorReadingsService: SensorReadingsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Create a new sensor reading',
    description: 'Records a new sensor reading with data validation and quality assessment'
  })
  @ApiResponse({
    status: 201,
    description: 'Sensor reading successfully created',
    type: SensorReadingResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Sensor not found or inactive'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data'
  })
  async createReading(@Body() createSensorReadingDto: CreateSensorReadingDto): Promise<SensorReadingResponseDto> {
    try {
      return await this.sensorReadingsService.createReading(createSensorReadingDto);
    } catch (error) {
      this.logger.error(`Failed to create reading: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to create sensor reading',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get sensor readings for a time period',
    description: 'Retrieves sensor readings for specified sensors and time period'
  })
  @ApiResponse({
    status: 200,
    description: 'Readings retrieved successfully',
    type: [SensorReadingResponseDto]
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters'
  })
  async getReadings(@Query() query: GetReadingsQueryDto): Promise<SensorReadingResponseDto[]> {
    try {
      return await this.sensorReadingsService.getReadings(query);
    } catch (error) {
      this.logger.error(`Failed to get readings: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to retrieve sensor readings',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest sensor readings',
    description: 'Retrieves the most recent readings for a sensor or station'
  })
  @ApiQuery({
    name: 'sensorSerialNumber',
    required: false,
    description: 'Serial number of the sensor',
    example: 'SENSOR-12345'
  })
  @ApiQuery({
    name: 'stationId',
    required: false,
    description: 'ID of the monitoring station'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of readings to return',
    type: Number
  })
  @ApiResponse({
    status: 200,
    description: 'Latest readings retrieved successfully',
    type: [SensorReadingResponseDto]
  })
  @ApiResponse({
    status: 400,
    description: 'Either sensorSerialNumber or stationId must be provided'
  })
  async getLatestReadings(
      @Query('sensorSerialNumber') sensorSerialNumber?: string,
      @Query('stationId') stationId?: number,
      @Query('limit') limit: number = 10
  ): Promise<SensorReadingResponseDto[]> {
    try {
      return await this.sensorReadingsService.getLatestReadings(
          sensorSerialNumber,
          stationId ? Number(stationId) : undefined,
          Number(limit)
      );
    } catch (error) {
      this.logger.error(`Failed to get latest readings: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to retrieve latest readings',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('aggregated')
  @ApiOperation({
    summary: 'Get aggregated sensor data',
    description: 'Retrieves aggregated data (average, min, max) for specified period and interval'
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated data retrieved successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters'
  })
  async getAggregatedData(@Query() query: AggregationQueryDto) {
    try {
      return await this.sensorReadingsService.getAggregatedData(query);
    } catch (error) {
      this.logger.error(`Failed to get aggregated data: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to retrieve aggregated data',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('quality/:sensorSerialNumber')
  @ApiOperation({
    summary: 'Validate data quality for a sensor',
    description: 'Assesses data quality for a sensor over the specified period'
  })
  @ApiParam({
    name: 'sensorSerialNumber',
    description: 'Serial number of the sensor',
    example: 'SENSOR-12345'
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Number of hours to analyze',
    type: Number
  })
  @ApiResponse({
    status: 200,
    description: 'Data quality assessment completed'
  })
  @ApiResponse({
    status: 404,
    description: 'Sensor not found'
  })
  async validateDataQuality(
      @Param('sensorSerialNumber') sensorSerialNumber: string,
      @Query('hours') hours: number = 24
  ) {
    try {
      return await this.sensorReadingsService.validateDataQuality(
          sensorSerialNumber,
          Number(hours)
      );
    } catch (error) {
      this.logger.error(`Failed to validate data quality: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to validate data quality',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process-raw-data')
  @ApiOperation({
    summary: 'Process raw sensor data',
    description: 'Processes unprocessed raw sensor data and converts to structured readings'
  })
  @ApiResponse({
    status: 201,
    description: 'Raw data processed successfully',
    type: [SensorReadingResponseDto]
  })
  async processRawData(): Promise<SensorReadingResponseDto[]> {
    try {
      return await this.sensorReadingsService.processRawSensorData();
    } catch (error) {
      this.logger.error(`Failed to process raw data: ${error.message}`);
      throw new HttpException(
          error.message || 'Failed to process raw sensor data',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
