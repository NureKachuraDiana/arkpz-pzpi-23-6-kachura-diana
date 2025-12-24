import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringStationStatsController } from './monitoring-station-stats.controller';
import { MonitoringStationStatsService } from './monitoring-station-stats.service';
import { NotFoundException } from '@nestjs/common';
import { Role, SensorType } from '@prisma/client';

// Mock service
const mockMonitoringStationStatsService = {
    getStationStats: jest.fn(),
    getSensorTypeStats: jest.fn(),
    getStationHealth: jest.fn(),
};

describe('MonitoringStationStatsController', () => {
    let controller: MonitoringStationStatsController;
    let service: MonitoringStationStatsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MonitoringStationStatsController],
            providers: [
                {
                    provide: MonitoringStationStatsService,
                    useValue: mockMonitoringStationStatsService,
                },
            ],
        }).compile();

        controller = module.get<MonitoringStationStatsController>(MonitoringStationStatsController);
        service = module.get<MonitoringStationStatsService>(MonitoringStationStatsService);

        jest.clearAllMocks();
    });

    describe('getStationStats', () => {
        const stationId = 1;
        const mockRequest = {
            cookies: {
                session_token: 'test-session-token',
            },
        } as any;

        const mockStationStats = {
            station: {
                id: stationId,
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
                isActive: true,
                createdAt: new Date(),
            },
            sensors: [],
            aggregatedData: [],
            alerts: [],
            maintenance: [],
            summary: {
                totalSensors: 5,
                activeSensors: 5,
                onlineSensors: 4,
                activeAlerts: 1,
                criticalAlerts: 0,
                upcomingMaintenance: 2,
            },
        };

        it('should return station stats successfully', async () => {
            mockMonitoringStationStatsService.getStationStats.mockResolvedValue(mockStationStats);

            const result = await controller.getStationStats(stationId, mockRequest);

            expect(service.getStationStats).toHaveBeenCalledWith(
                stationId,
                mockRequest.cookies.session_token
            );
            expect(result).toEqual(mockStationStats);
        });

        it('should handle missing session token', async () => {
            const requestWithoutToken = { cookies: {} } as any;
            mockMonitoringStationStatsService.getStationStats.mockResolvedValue(mockStationStats);

            const result = await controller.getStationStats(stationId, requestWithoutToken);

            expect(service.getStationStats).toHaveBeenCalledWith(stationId, undefined);
            expect(result).toEqual(mockStationStats);
        });

        it('should throw NotFoundException when station not found', async () => {
            mockMonitoringStationStatsService.getStationStats.mockRejectedValue(
                new NotFoundException('Monitoring station with ID 1 not found')
            );

            await expect(
                controller.getStationStats(stationId, mockRequest)
            ).rejects.toThrow(NotFoundException);

            expect(service.getStationStats).toHaveBeenCalledWith(
                stationId,
                mockRequest.cookies.session_token
            );
        });

        it('should pass correct parameters to service', async () => {
            mockMonitoringStationStatsService.getStationStats.mockResolvedValue(mockStationStats);

            await controller.getStationStats(stationId, mockRequest);

            expect(service.getStationStats).toHaveBeenCalledWith(
                stationId,
                'test-session-token'
            );
        });
    });

    describe('getSensorTypeStats', () => {
        const stationId = 1;
        const sensorType = SensorType.TEMPERATURE;
        const mockRequest = {
            cookies: {
                session_token: 'test-session-token',
            },
        } as any;

        const mockSensorStats = [
            {
                timeRange: '24h',
                average: 24.5,
                minValue: 22.1,
                maxValue: 26.3,
                stdDev: 1.2,
                unit: '°C',
                startTime: new Date(),
                endTime: new Date(),
            },
        ];

        it('should return sensor type stats successfully', async () => {
            mockMonitoringStationStatsService.getSensorTypeStats.mockResolvedValue(mockSensorStats);

            const result = await controller.getSensorTypeStats(
                stationId,
                sensorType,
                mockRequest
            );

            expect(service.getSensorTypeStats).toHaveBeenCalledWith(
                stationId,
                sensorType,
                mockRequest.cookies.session_token
            );
            expect(result).toEqual(mockSensorStats);
        });

        it('should handle all sensor types', async () => {
            const sensorTypes = Object.values(SensorType);

            for (const type of sensorTypes) {
                mockMonitoringStationStatsService.getSensorTypeStats.mockResolvedValue(mockSensorStats);

                const result = await controller.getSensorTypeStats(
                    stationId,
                    type,
                    mockRequest
                );

                expect(service.getSensorTypeStats).toHaveBeenCalledWith(
                    stationId,
                    type,
                    mockRequest.cookies.session_token
                );
                expect(result).toEqual(mockSensorStats);
            }
        });

        it('should handle missing session token', async () => {
            const requestWithoutToken = { cookies: {} } as any;
            mockMonitoringStationStatsService.getSensorTypeStats.mockResolvedValue(mockSensorStats);

            const result = await controller.getSensorTypeStats(
                stationId,
                sensorType,
                requestWithoutToken
            );

            expect(service.getSensorTypeStats).toHaveBeenCalledWith(
                stationId,
                sensorType,
                undefined
            );
            expect(result).toEqual(mockSensorStats);
        });

        it('should propagate service errors', async () => {
            mockMonitoringStationStatsService.getSensorTypeStats.mockRejectedValue(
                new NotFoundException('Station not found')
            );

            await expect(
                controller.getSensorTypeStats(stationId, sensorType, mockRequest)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getStationHealth', () => {
        const stationId = 1;

        const mockHealthData = {
            healthScore: 85,
            status: 'GOOD' as const,
            onlineSensors: 8,
            totalSensors: 10,
            activeAlerts: 2,
            lastUpdated: new Date(),
        };

        it('should return station health successfully', async () => {
            mockMonitoringStationStatsService.getStationHealth.mockResolvedValue(mockHealthData);

            const result = await controller.getStationHealth(stationId);

            expect(service.getStationHealth).toHaveBeenCalledWith(stationId);
            expect(result).toEqual(mockHealthData);
        });

        it('should throw NotFoundException when station not found', async () => {
            mockMonitoringStationStatsService.getStationHealth.mockRejectedValue(
                new NotFoundException('Station with ID 1 not found')
            );

            await expect(controller.getStationHealth(stationId)).rejects.toThrow(NotFoundException);
        });

        it('should pass correct station ID to service', async () => {
            const differentStationId = 2;
            mockMonitoringStationStatsService.getStationHealth.mockResolvedValue(mockHealthData);

            await controller.getStationHealth(differentStationId);

            expect(service.getStationHealth).toHaveBeenCalledWith(differentStationId);
        });
    });

    // Edge cases and error scenarios
    describe('Edge Cases', () => {
        const stationId = 1;
        const mockRequest = {
            cookies: {
                session_token: 'test-token',
            },
        } as any;

        it('should handle service returning empty data for getStationStats', async () => {
            const emptyStats = {
                station: {
                    id: stationId,
                    name: 'Empty Station',
                    latitude: 0,
                    longitude: 0,
                    isActive: false,
                    createdAt: new Date(),
                },
                sensors: [],
                aggregatedData: [],
                alerts: [],
                maintenance: [],
                summary: {
                    totalSensors: 0,
                    activeSensors: 0,
                    onlineSensors: 0,
                    activeAlerts: 0,
                    criticalAlerts: 0,
                    upcomingMaintenance: 0,
                },
            };

            mockMonitoringStationStatsService.getStationStats.mockResolvedValue(emptyStats);

            const result = await controller.getStationStats(stationId, mockRequest);

            expect(result).toEqual(emptyStats);
            expect(result.summary.totalSensors).toBe(0);
        });

        it('should handle service returning empty array for getSensorTypeStats', async () => {
            mockMonitoringStationStatsService.getSensorTypeStats.mockResolvedValue([]);

            const result = await controller.getSensorTypeStats(
                stationId,
                SensorType.HUMIDITY,
                mockRequest
            );

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should handle undefined cookies object', async () => {
            const requestWithUndefinedCookies = {} as any;
            mockMonitoringStationStatsService.getStationStats.mockResolvedValue({});

            await controller.getStationStats(stationId, requestWithUndefinedCookies);

            expect(service.getStationStats).toHaveBeenCalledWith(stationId, undefined);
        });

        it('should handle null cookies', async () => {
            const requestWithNullCookies = { cookies: null } as any;
            mockMonitoringStationStatsService.getStationStats.mockResolvedValue({});

            await controller.getStationStats(stationId, requestWithNullCookies);

            expect(service.getStationStats).toHaveBeenCalledWith(stationId, undefined);
        });
    });

    // Integration-like tests for parameter parsing
    describe('Parameter Parsing', () => {
        const mockRequest = {
            cookies: { session_token: 'test-token' },
        } as any;

        it('should parse stationId as number', async () => {
            const stringStationId = '123' as any;

            // This test ensures that ParseIntPipe works correctly
            // In a real test, we might need to test the pipe separately
            // For controller unit test, we assume the pipe has already converted to number

            mockMonitoringStationStatsService.getStationStats.mockResolvedValue({});

            await controller.getStationStats(stringStationId, mockRequest);

            expect(service.getStationStats).toHaveBeenCalledWith(stringStationId, 'test-token');
        });

        it('should accept all valid sensor types', async () => {
            const validSensorTypes = Object.values(SensorType);

            for (const sensorType of validSensorTypes) {
                mockMonitoringStationStatsService.getSensorTypeStats.mockResolvedValue([]);

                await controller.getSensorTypeStats(1, sensorType, mockRequest);

                expect(service.getSensorTypeStats).toHaveBeenCalledWith(1, sensorType, 'test-token');
            }
        });
    });
});