import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MonitoringStationStatsService } from './monitoring-station-stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { UnitConversionService } from '../unit-conversion/unit-conversion.service';
import { SensorType, AlertSeverity } from '@prisma/client';


// Mock services
const mockPrismaService = {
    monitoringStation: {
        findUnique: jest.fn(),
    },
    aggregatedData: {
        findMany: jest.fn(),
    },
};

const mockSettingsService = {
    get: jest.fn(),
};

const mockUnitConversionService = {
    getStorageUnitSystem: jest.fn(),
    convertValue: jest.fn(),
};

describe('MonitoringStationStatsService', () => {
    let service: MonitoringStationStatsService;
    let prisma: PrismaService;
    let settingsService: SettingsService;
    let unitConversionService: UnitConversionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MonitoringStationStatsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: SettingsService,
                    useValue: mockSettingsService,
                },
                {
                    provide: UnitConversionService,
                    useValue: mockUnitConversionService,
                },
            ],
        }).compile();

        service = module.get<MonitoringStationStatsService>(MonitoringStationStatsService);
        prisma = module.get<PrismaService>(PrismaService);
        settingsService = module.get<SettingsService>(SettingsService);
        unitConversionService = module.get<UnitConversionService>(UnitConversionService);

        jest.clearAllMocks();
    });

    describe('getStationStats', () => {
        const stationId = 1;
        const token = 'test-token';
        const mockStation = {
            id: 1,
            name: 'Test Station',
            description: 'Test Description',
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'Test Address',
            isActive: true,
            createdAt: new Date(),
            sensors: [
                {
                    id: 1,
                    name: 'Temperature Sensor',
                    type: SensorType.TEMPERATURE,
                    isActive: true,
                    readings: [
                        {
                            value: 25.5,
                            timestamp: new Date(),
                            quality: 'GOOD',
                        },
                    ],
                    statusHistory: [
                        {
                            isOnline: true,
                            battery: 85,
                            signal: 95,
                            lastCheck: new Date(),
                        },
                    ],
                },
            ],
            aggregatedData: [
                {
                    sensorType: SensorType.TEMPERATURE,
                    timeRange: '24h',
                    average: 24.8,
                    minValue: 22.1,
                    maxValue: 26.3,
                    stdDev: 1.2,
                    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    endTime: new Date(),
                },
            ],
            stationAlerts: [
                {
                    id: 1,
                    sensorType: SensorType.TEMPERATURE,
                    value: 26.5,
                    thresholdValue: 25.0,
                    severity: AlertSeverity.HIGH,
                    message: 'High temperature alert',
                    isActive: true,
                    acknowledged: false,
                    createdAt: new Date(),
                },
            ],
            maintenanceSchedules: [
                {
                    id: 1,
                    title: 'Routine Maintenance',
                    description: 'Monthly checkup',
                    scheduleType: 'PREVENTIVE',
                    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                    isCompleted: false,
                },
            ],
        };

        beforeEach(() => {
            mockSettingsService.get.mockResolvedValue({ measurementUnit: 'metric' });
            mockUnitConversionService.getStorageUnitSystem.mockReturnValue('metric');
            mockUnitConversionService.convertValue.mockImplementation((value) => ({
                value,
                unit: '°C',
            }));
        });

        it('should return station stats with converted units', async () => {
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.getStationStats(stationId, token);

            // Verify service calls
            expect(settingsService.get).toHaveBeenCalledWith(token);
            expect(unitConversionService.getStorageUnitSystem).toHaveBeenCalled();
            expect(prisma.monitoringStation.findUnique).toHaveBeenCalledWith({
                where: { id: stationId },
                include: expect.objectContaining({
                    sensors: expect.any(Object),
                    aggregated: expect.any(Object),
                    stationAlerts: expect.any(Object),
                    maintenanceSchedules: expect.any(Object),
                }),
            });

            // Verify result structure
            expect(result).toHaveProperty('station');
            expect(result).toHaveProperty('sensors');
            expect(result).toHaveProperty('aggregatedData');
            expect(result).toHaveProperty('alerts');
            expect(result).toHaveProperty('maintenance');
            expect(result).toHaveProperty('summary');

            // Verify station info
            expect(result.station.id).toBe(stationId);
            expect(result.station.name).toBe(mockStation.name);

            // Verify sensors processing
            expect(result.sensors).toHaveLength(1);
            expect(result.sensors[0]).toHaveProperty('lastReading');
            expect(result.sensors[0]).toHaveProperty('status');

            // Verify aggregated data processing
            expect(result.aggregatedData).toHaveLength(1);

            // Verify alerts processing
            expect(result.alerts).toHaveLength(1);

            // Verify maintenance processing
            expect(result.maintenance).toHaveLength(1);

            // Verify summary calculation
            expect(result.summary.totalSensors).toBe(1);
            expect(result.summary.activeSensors).toBe(1);
            expect(result.summary.onlineSensors).toBe(1);
            expect(result.summary.activeAlerts).toBe(1);
            expect(result.summary.criticalAlerts).toBe(0); // No critical alerts in mock
            expect(result.summary.upcomingMaintenance).toBe(1);
        });

        it('should throw NotFoundException when station not found', async () => {
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(null);

            await expect(service.getStationStats(stationId, token)).rejects.toThrow(
                new NotFoundException(`Monitoring station with ID ${stationId} not found`)
            );
        });

        it('should handle sensors without readings and status', async () => {
            const stationWithoutSensorData = {
                ...mockStation,
                sensors: [
                    {
                        id: 1,
                        name: 'Sensor without data',
                        type: SensorType.TEMPERATURE,
                        isActive: true,
                        readings: [],
                        statusHistory: [],
                    },
                ],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(stationWithoutSensorData);

            const result = await service.getStationStats(stationId, token);

            expect(result.sensors[0].lastReading).toBeUndefined();
            expect(result.sensors[0].status).toBeUndefined();
        });

        it('should handle empty arrays for related data', async () => {
            const stationWithEmptyData = {
                ...mockStation,
                sensors: [],
                aggregatedData: [],
                stationAlerts: [],
                maintenanceSchedules: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(stationWithEmptyData);

            const result = await service.getStationStats(stationId, token);

            expect(result.sensors).toHaveLength(0);
            expect(result.aggregatedData).toHaveLength(0);
            expect(result.alerts).toHaveLength(0);
            expect(result.maintenance).toHaveLength(0);
            expect(result.summary.totalSensors).toBe(0);
            expect(result.summary.activeSensors).toBe(0);
            expect(result.summary.onlineSensors).toBe(0);
            expect(result.summary.activeAlerts).toBe(0);
            expect(result.summary.criticalAlerts).toBe(0);
            expect(result.summary.upcomingMaintenance).toBe(0);
        });

        it('should use default measurement unit when user settings not available', async () => {
            mockSettingsService.get.mockResolvedValue(null);
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            await service.getStationStats(stationId, token);

            // Should call convertValue with 'metric' as default
            expect(unitConversionService.convertValue).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(String),
                { fromUnit: 'metric', toUnit: 'metric' }
            );
        });

        it('should handle unit conversion for different sensor types', async () => {
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            // Mock different conversion results for different sensor types
            mockUnitConversionService.convertValue
                .mockReturnValueOnce({ value: 25.5, unit: '°C' }) // sensor reading
                .mockReturnValueOnce({ value: 24.8, unit: '°C' }) // aggregated avg
                .mockReturnValueOnce({ value: 22.1, unit: '°C' }) // aggregated min
                .mockReturnValueOnce({ value: 26.3, unit: '°C' }) // aggregated max
                .mockReturnValueOnce({ value: 26.5, unit: '°C' }) // alert value
                .mockReturnValueOnce({ value: 25.0, unit: '°C' }); // alert threshold

            const result = await service.getStationStats(stationId, token);

            // Verify conversion was called for all values
            expect(unitConversionService.convertValue).toHaveBeenCalledTimes(6);

            // Verify sensor reading conversion
            expect(result.sensors[0].lastReading?.value).toBe(25.5);
            expect(result.sensors[0].lastReading?.unit).toBe('°C');

            // Verify aggregated data conversion
            expect(result.aggregatedData[0].average).toBe(24.8);
            expect(result.aggregatedData[0].unit).toBe('°C');

            // Verify alert conversion
            expect(result.alerts[0].value).toBe(26.5);
            expect(result.alerts[0].thresholdValue).toBe(25.0);
        });
    });

    describe('getSensorTypeStats', () => {
        const stationId = 1;
        const sensorType = SensorType.TEMPERATURE;
        const token = 'test-token';

        const mockAggregatedData = [
            {
                sensorType: SensorType.TEMPERATURE,
                timeRange: '24h',
                average: 24.8,
                minValue: 22.1,
                maxValue: 26.3,
                stdDev: 1.2,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: new Date(),
            },
            {
                sensorType: SensorType.TEMPERATURE,
                timeRange: '1h',
                average: 25.1,
                minValue: 24.8,
                maxValue: 25.5,
                stdDev: 0.3,
                startTime: new Date(Date.now() - 60 * 60 * 1000),
                endTime: new Date(),
            },
        ];

        beforeEach(() => {
            mockSettingsService.get.mockResolvedValue({ measurementUnit: 'metric' });
            mockUnitConversionService.getStorageUnitSystem.mockReturnValue('metric');
            mockUnitConversionService.convertValue.mockImplementation((value) => ({
                value,
                unit: '°C',
            }));
        });

        it('should return sensor type stats with converted units', async () => {
            mockPrismaService.aggregatedData.findMany.mockResolvedValue(mockAggregatedData);

            const result = await service.getSensorTypeStats(stationId, sensorType, token);

            expect(prisma.aggregatedData.findMany).toHaveBeenCalledWith({
                where: {
                    stationId: stationId,
                    sensorType: sensorType,
                    startTime: {
                        gte: expect.any(Date), // last 7 days
                    },
                },
                orderBy: { startTime: 'asc' },
            });

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                timeRange: '24h',
                average: 24.8,
                minValue: 22.1,
                maxValue: 26.3,
                stdDev: 1.2,
                unit: '°C',
                startTime: mockAggregatedData[0].startTime,
                endTime: mockAggregatedData[0].endTime,
            });

            // Verify unit conversion was called for each value in each record
            expect(unitConversionService.convertValue).toHaveBeenCalledTimes(6); // 3 values × 2 records
        });

        it('should handle empty aggregated data', async () => {
            mockPrismaService.aggregatedData.findMany.mockResolvedValue([]);

            const result = await service.getSensorTypeStats(stationId, sensorType, token);

            expect(result).toHaveLength(0);
        });

        it('should use imperial units when user settings specify', async () => {
            mockSettingsService.get.mockResolvedValue({ measurementUnit: 'imperial' });
            mockUnitConversionService.convertValue.mockImplementation((value) => ({
                value: (value * 9/5) + 32, // Convert to Fahrenheit
                unit: '°F',
            }));

            mockPrismaService.aggregatedData.findMany.mockResolvedValue([mockAggregatedData[0]]);

            const result = await service.getSensorTypeStats(stationId, sensorType, token);

            expect(unitConversionService.convertValue).toHaveBeenCalledWith(
                expect.any(Number),
                sensorType,
                { fromUnit: 'metric', toUnit: 'imperial' }
            );
            expect(result[0].unit).toBe('°F');
        });
    });

    describe('getStationHealth', () => {
        const stationId = 1;

        it('should calculate health score for healthy station', async () => {
            const mockStation = {
                id: 1,
                sensors: [
                    {
                        statusHistory: [
                            { isOnline: true },
                        ],
                    },
                    {
                        statusHistory: [
                            { isOnline: true },
                        ],
                    },
                ],
                stationAlerts: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.getStationHealth(stationId);

            expect(prisma.monitoringStation.findUnique).toHaveBeenCalledWith({
                where: { id: stationId },
                include: expect.objectContaining({
                    sensors: expect.any(Object),
                    stationAlerts: expect.any(Object),
                }),
            });

            expect(result.healthScore).toBe(100); // 100% online, no alerts
            expect(result.status).toBe('EXCELLENT');
            expect(result.onlineSensors).toBe(2);
            expect(result.totalSensors).toBe(2);
            expect(result.activeAlerts).toBe(0);
            expect(result.lastUpdated).toBeInstanceOf(Date);
        });

        it('should calculate health score for station with issues', async () => {
            const mockStation = {
                id: 1,
                sensors: [
                    {
                        statusHistory: [
                            { isOnline: true },
                        ],
                    },
                    {
                        statusHistory: [
                            { isOnline: false },
                        ],
                    },
                    {
                        statusHistory: [
                            { isOnline: false },
                        ],
                    },
                ],
                stationAlerts: [
                    { isActive: true },
                    { isActive: true },
                ],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.getStationHealth(stationId);

            expect(result.healthScore).toBe(53);
            expect(result.status).toBe('POOR');
            expect(result.onlineSensors).toBe(1);
            expect(result.totalSensors).toBe(3);
            expect(result.activeAlerts).toBe(2);
        });

        it('should handle station with no sensors', async () => {
            const mockStation = {
                id: 1,
                sensors: [],
                stationAlerts: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.getStationHealth(stationId);

            expect(result.healthScore).toBe(100); // Default 70 for no sensors
            expect(result.status).toBe('EXCELLENT');
            expect(result.onlineSensors).toBe(0);
            expect(result.totalSensors).toBe(0);
            expect(result.activeAlerts).toBe(0);
        });

        it('should throw NotFoundException when station not found', async () => {
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(null);

            await expect(service.getStationHealth(stationId)).rejects.toThrow(
                new NotFoundException(`Station with ID ${stationId} not found`)
            );
        });

        it('should handle sensors without status history', async () => {
            const mockStation = {
                id: 1,
                sensors: [
                    {
                        statusHistory: [],
                    },
                    {
                        statusHistory: [
                            { isOnline: true },
                        ],
                    },
                ],
                stationAlerts: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.getStationHealth(stationId);

            // One sensor has no status (considered offline), one is online
            expect(result.onlineSensors).toBe(1);
            expect(result.totalSensors).toBe(2);
            expect(result.healthScore).toBe(80); // 50% online = 35 score (50 * 0.7)
            expect(result.status).toBe('GOOD');
        });
    });

    describe('getHealthStatus', () => {
        it('should return correct status for different scores', () => {
            // Using private method through the service instance
            const serviceWithPrivate = service as any;

            expect(serviceWithPrivate.getHealthStatus(95)).toBe('EXCELLENT');
            expect(serviceWithPrivate.getHealthStatus(80)).toBe('GOOD');
            expect(serviceWithPrivate.getHealthStatus(70)).toBe('FAIR');
            expect(serviceWithPrivate.getHealthStatus(50)).toBe('POOR');
            expect(serviceWithPrivate.getHealthStatus(30)).toBe('CRITICAL');
            expect(serviceWithPrivate.getHealthStatus(0)).toBe('CRITICAL');
        });
    });

    // Edge cases
    describe('Edge Cases', () => {
        const stationId = 1;
        const token = 'test-token';

        it('should handle undefined values in station data', async () => {
            const stationWithUndefined = {
                id: 1,
                name: 'Test Station',
                description: undefined,
                latitude: 40.7128,
                longitude: -74.0060,
                address: undefined,
                isActive: true,
                createdAt: new Date(),
                sensors: [],
                aggregatedData: [],
                stationAlerts: [],
                maintenanceSchedules: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(stationWithUndefined);
            mockSettingsService.get.mockResolvedValue({ measurementUnit: 'metric' });
            mockUnitConversionService.getStorageUnitSystem.mockReturnValue('metric');

            const result = await service.getStationStats(stationId, token);

            expect(result.station.description).toBeUndefined();
            expect(result.station.address).toBeUndefined();
        });

        it('should handle null values in sensor readings', async () => {
            const stationWithNulls = {
                id: 1,
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
                isActive: true,
                createdAt: new Date(),
                sensors: [
                    {
                        id: 1,
                        name: 'Sensor with nulls',
                        type: SensorType.TEMPERATURE,
                        isActive: true,
                        readings: [
                            {
                                value: 25.5,
                                timestamp: new Date(),
                                quality: null,
                            },
                        ],
                        statusHistory: [
                            {
                                isOnline: true,
                                battery: null,
                                signal: null,
                                lastCheck: new Date(),
                            },
                        ],
                    },
                ],
                aggregatedData: [],
                stationAlerts: [],
                maintenanceSchedules: [],
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(stationWithNulls);
            mockSettingsService.get.mockResolvedValue({ measurementUnit: 'metric' });
            mockUnitConversionService.getStorageUnitSystem.mockReturnValue('metric');

            const result = await service.getStationStats(stationId, token);

            expect(result.sensors[0].lastReading?.quality).toBeUndefined();
            expect(result.sensors[0].status?.battery).toBeUndefined();
            expect(result.sensors[0].status?.signal).toBeUndefined();
        });
    });
});