import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SensorType, AlertSeverity } from '@prisma/client';
import { UnitConversionService } from "../unit-conversion/unit-conversion.service";
import { StationStatsDto } from "./dto/station-stats.dto";

@Injectable()
export class MonitoringStationStatsService {
    constructor(
        private prisma: PrismaService,
        private settingsService: SettingsService,
        private unitConversion: UnitConversionService,
    ) {}

    async getStationStats(stationId: number, token: string): Promise<StationStatsDto> {
        const userSettings = await this.settingsService.get(token);
        const userUnitSystem = userSettings?.measurementUnit || 'metric';
        const storageUnitSystem = this.unitConversion.getStorageUnitSystem();

        // Get station data with related entities
        const station: any = await this.prisma.monitoringStation.findUnique({
            where: { id: stationId },
            include: {
                sensors: {
                    where: { isActive: true },
                    include: {
                        readings: {
                            orderBy: { timestamp: 'desc' },
                            take: 1,
                        },
                        statusHistory: {
                            orderBy: { lastCheck: 'desc' },
                            take: 1,
                        },
                    },
                },
                aggregated: {
                    where: {
                        timeRange: '24h',
                        startTime: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                    orderBy: { startTime: 'desc' },
                },
                stationAlerts: {
                    where: {
                        isActive: true,
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                maintenanceSchedules: {
                    where: {
                        isCompleted: false,
                        startDate: { gte: new Date() },
                    },
                    orderBy: { startDate: 'asc' },
                    take: 10,
                },
            },
        } as any );

        if (!station) {
            throw new NotFoundException(`Monitoring station with ID ${stationId} not found`);
        }

        // Process sensor data with unit conversion
        const processedSensors = (station.sensors || []).map(sensor => {
            const lastReading = sensor.readings[0];
            const status = sensor.statusHistory[0];

            let processedReading: StationStatsDto['sensors'][0]['lastReading'] | undefined = undefined;

            if (lastReading) {
                const converted = this.unitConversion.convertValue(
                    lastReading.value,
                    sensor.type,
                    {
                        fromUnit: storageUnitSystem,
                        toUnit: userUnitSystem as 'metric' | 'imperial'
                    }
                );
                processedReading = {
                    value: converted.value,
                    unit: converted.unit,
                    timestamp: lastReading.timestamp,
                    quality: lastReading.quality ?? undefined,
                };
            }

            return {
                id: sensor.id,
                name: sensor.name,
                type: sensor.type,
                isActive: sensor.isActive,
                lastReading: processedReading,
                status: status ? {
                    isOnline: status.isOnline,
                    battery: status.battery ?? undefined,
                    signal: status.signal ?? undefined,
                    lastCheck: status.lastCheck,
                } : undefined,
            };
        });

        // Process aggregated data
        const processedAggregated = (station.aggregated || []).map(agg => {
            const convertedAvg = this.unitConversion.convertValue(
                agg.average,
                agg.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            const convertedMin = this.unitConversion.convertValue(
                agg.minValue,
                agg.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            const convertedMax = this.unitConversion.convertValue(
                agg.maxValue,
                agg.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            return {
                sensorType: agg.sensorType,
                timeRange: agg.timeRange,
                average: convertedAvg.value,
                minValue: convertedMin.value,
                maxValue: convertedMax.value,
                stdDev: agg.stdDev ?? undefined,
                unit: convertedAvg.unit,
                startTime: agg.startTime,
                endTime: agg.endTime,
            };
        });

        // Process alerts with unit conversion
        const processedAlerts = (station.stationAlerts || []).map(alert => {
            const convertedValue = this.unitConversion.convertValue(
                alert.value,
                alert.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            const convertedThreshold = this.unitConversion.convertValue(
                alert.thresholdValue,
                alert.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );

            return {
                id: alert.id,
                sensorType: alert.sensorType,
                value: convertedValue.value,
                thresholdValue: convertedThreshold.value,
                severity: alert.severity,
                message: alert.message,
                isActive: alert.isActive,
                acknowledged: alert.acknowledged,
                createdAt: alert.createdAt,
            };
        });

        // Process maintenance schedule
        const processedMaintenance = (station.maintenanceSchedules || []).map(maintenance => ({
            id: maintenance.id,
            title: maintenance.title,
            description: maintenance.description ?? undefined,
            scheduleType: maintenance.scheduleType,
            startDate: maintenance.startDate,
            endDate: maintenance.endDate ?? undefined,
            isCompleted: maintenance.isCompleted,
        }));

        // Calculate summary
        const onlineSensors = processedSensors.filter(sensor => sensor.status?.isOnline).length;
        const activeAlerts = processedAlerts.filter(alert => alert.isActive).length;
        const criticalAlerts = processedAlerts.filter(alert =>
            alert.isActive && alert.severity === AlertSeverity.CRITICAL
        ).length;

        const summary = {
            totalSensors: processedSensors.length,
            activeSensors: processedSensors.filter(s => s.isActive).length,
            onlineSensors,
            activeAlerts,
            criticalAlerts,
            upcomingMaintenance: processedMaintenance.length,
        };

        return {
            station: {
                id: station.id,
                name: station.name,
                description: station.description ?? undefined,
                latitude: station.latitude,
                longitude: station.longitude,
                address: station.address ?? undefined,
                isActive: station.isActive,
                createdAt: station.createdAt,
            },
            sensors: processedSensors,
            aggregatedData: processedAggregated,
            alerts: processedAlerts,
            maintenance: processedMaintenance,
            summary,
        };
    }

    async getSensorTypeStats(stationId: number, sensorType: SensorType, token: string) {
        const userSettings = await this.settingsService.get(token);
        const userUnitSystem = userSettings?.measurementUnit || 'metric';
        const storageUnitSystem = this.unitConversion.getStorageUnitSystem();

        const stats = await this.prisma.aggregatedData.findMany({
            where: {
                stationId: stationId,
                sensorType: sensorType,
                startTime: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
                },
            },
            orderBy: { startTime: 'asc' },
        } as any );

        return stats.map(stat => {
            const convertedAvg = this.unitConversion.convertValue(
                stat.average,
                stat.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            const convertedMin = this.unitConversion.convertValue(
                stat.minValue,
                stat.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );
            const convertedMax = this.unitConversion.convertValue(
                stat.maxValue,
                stat.sensorType,
                { fromUnit: storageUnitSystem, toUnit: userUnitSystem as 'metric' | 'imperial' }
            );

            return {
                timeRange: stat.timeRange,
                average: convertedAvg.value,
                minValue: convertedMin.value,
                maxValue: convertedMax.value,
                stdDev: stat.stdDev ?? undefined,
                unit: convertedAvg.unit,
                startTime: stat.startTime,
                endTime: stat.endTime,
            };
        });
    }

    async getStationHealth(stationId: number) {
        const station: any = await this.prisma.monitoringStation.findUnique({
            where: { id: stationId },
            include: {
                sensors: {
                    include: {
                        statusHistory: {
                            orderBy: { lastCheck: 'desc' },
                            take: 1,
                        },
                    },
                },
                stationAlerts: {
                    where: { isActive: true },
                },
            },
        } as any);

        if (!station) {
            throw new NotFoundException(`Station with ID ${stationId} not found`);
        }

        const totalSensors = station.sensors.length;
        const onlineSensors = station.sensors.filter(s => {
            const latestStatus = s.statusHistory[0];
            return latestStatus?.isOnline === true;
        }).length;
        const activeAlerts = station.stationAlerts.length;

        // Calculate health score (0-100)
        const baseScore = 100;
        const offlinePenalty = totalSensors > 0 ?
            ((totalSensors - onlineSensors) / totalSensors) * 40 : 0;
        const alertPenalty = Math.min(activeAlerts * 10, 30);

        const healthScore = Math.max(0, baseScore - offlinePenalty - alertPenalty);

        return {
            healthScore: Math.round(healthScore),
            status: this.getHealthStatus(healthScore),
            onlineSensors,
            totalSensors,
            activeAlerts,
            lastUpdated: new Date(),
        };
    }

    private getHealthStatus(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
        if (score >= 90) return 'EXCELLENT';
        if (score >= 75) return 'GOOD';
        if (score >= 60) return 'FAIR';
        if (score >= 40) return 'POOR';
        return 'CRITICAL';
    }
}

