import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common';
import {MonitoringStationStatsService} from "./monitoring-station-stats.service";
import {ApiOperation, ApiParam, ApiResponse, ApiTags} from "@nestjs/swagger";
import type { Response, Request } from 'express';
import {Roles} from "../auth/decorators/roles.decorator";
import {Role, SensorType} from "@prisma/client";

@ApiTags('Monitoring station stats')
@Controller('monitoring-station-stats')
export class MonitoringStationStatsController {
    constructor(private readonly monitoringStationStatsService: MonitoringStationStatsService)
    {}

    @Get(':stationId')
    @Roles(Role.OPERATOR)
    @ApiOperation({ summary: 'Get comprehensive statistics for a monitoring station'})
    @ApiParam({ name: 'stationId', description: 'monitoring station ID'})
    @ApiResponse({ status: 200, description: 'Station statistics retrieved successfully'})
    @ApiResponse({ status: 404, description: 'Station not found' })
    async getStationStats(
        @Param('stationId', ParseIntPipe) stationId: number,
        @Req() request: Request,
    ) {
        const token = request.cookies?.session_token;
        return this.monitoringStationStatsService.getStationStats(stationId, token)
    }

    @Get(':stationId/sensor-type/:sensorType')
    @Roles(Role.OPERATOR)
    @ApiOperation({ summary: 'Get statistics for specific sensor type' })
    @ApiParam({ name: 'stationId', description: 'Monitoring station ID' })
    @ApiParam({
        name: 'sensorType',
        enum: SensorType,
        description: 'Type of sensor'
    })
    @ApiResponse({ status: 200, description: 'Sensor type statistics retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Station or sensor data not found' })
    async getSensorTypeStats(
        @Param('stationId', ParseIntPipe) stationId: number,
        @Param('sensorType') sensorType: SensorType,
        @Req() request: Request,
    ) {
        const token = request.cookies?.session_token;
        return this.monitoringStationStatsService.getSensorTypeStats(stationId, sensorType, token)
    }

    @Get('health/:stationId')
    @Roles(Role.OPERATOR)
    @ApiOperation({ summary: 'Get health status of monitoring station' })
    @ApiParam({ name: 'stationId', description: 'Monitoring station ID' })
    @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    async getStationHealth(
        @Param('stationId', ParseIntPipe) stationId: number,
    ) {
        return this.monitoringStationStatsService.getStationHealth(stationId);
    }
}
