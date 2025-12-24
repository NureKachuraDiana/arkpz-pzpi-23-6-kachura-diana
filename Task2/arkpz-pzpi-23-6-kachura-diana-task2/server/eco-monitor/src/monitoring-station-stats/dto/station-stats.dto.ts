import { ApiProperty } from '@nestjs/swagger';
import { SensorType, AlertSeverity, MaintenanceScheduleType } from '@prisma/client';

export class StationStatsDto {
    @ApiProperty({ description: 'Station information' })
    station: {
        id: number;
        name: string;
        description?: string;
        latitude: number;
        longitude: number;
        address?: string;
        isActive: boolean;
        createdAt: Date;
    };

    @ApiProperty({ description: 'List of sensors with latest readings' })
    sensors: Array<{
        id: number;
        name: string;
        type: SensorType;
        isActive: boolean;
        lastReading?: {
            value: number;
            unit: string;
            timestamp: Date;
            quality?: number;
        };
        status?: {
            isOnline: boolean;
            battery?: number;
            signal?: number;
            lastCheck: Date;
        };
    }>;

    @ApiProperty({ description: 'Aggregated data for different time ranges' })
    aggregatedData: Array<{
        sensorType: SensorType;
        timeRange: string;
        average: number;
        minValue: number;
        maxValue: number;
        stdDev?: number;
        unit: string;
        startTime: Date;
        endTime: Date;
    }>;

    @ApiProperty({ description: 'Active alerts for the station' })
    alerts: Array<{
        id: number;
        sensorType: SensorType;
        value: number;
        thresholdValue: number;
        severity: AlertSeverity;
        message: string;
        isActive: boolean;
        acknowledged: boolean;
        createdAt: Date;
    }>;

    @ApiProperty({ description: 'Upcoming maintenance schedules' })
    maintenance: Array<{
        id: number;
        title: string;
        description?: string;
        scheduleType: MaintenanceScheduleType;
        startDate: Date;
        endDate?: Date;
        isCompleted: boolean;
    }>;

    @ApiProperty({ description: 'Summary statistics' })
    summary: {
        totalSensors: number;
        activeSensors: number;
        onlineSensors: number;
        activeAlerts: number;
        criticalAlerts: number;
        upcomingMaintenance: number;
    };
}