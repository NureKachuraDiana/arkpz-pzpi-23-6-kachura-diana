import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MonitoringStationService } from './monitoring-station.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonitoringStationDto } from './dto/create-monitoring-station.dto';
import { UpdateMonitoringStationDto } from './dto/update-monitoring-station.dto';
import { GetMonitoringStationInRadiusDto } from './dto/get-monitoring-station-in-radius.dto';

// Mock PrismaService
const mockPrismaService = {
    monitoringStation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $queryRaw: jest.fn(),
};

describe('MonitoringStationService', () => {
    let service: MonitoringStationService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MonitoringStationService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<MonitoringStationService>(MonitoringStationService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto: CreateMonitoringStationDto = {
            name: 'Test Station',
            latitude: 40.7128,
            longitude: -74.0060,
            description: 'Test Description',
            address: 'Test Address',
            isActive: true,
        };

        const mockStation = {
            id: 1,
            ...createDto,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should create monitoring station with all fields', async () => {
            mockPrismaService.monitoringStation.create.mockResolvedValue(mockStation);

            const result = await service.create(createDto);

            expect(prisma.monitoringStation.create).toHaveBeenCalledWith({
                data: {
                    ...createDto,
                    description: createDto.description,
                    address: createDto.address,
                    isActive: true,
                },
            });
            expect(result).toEqual(mockStation);
        });

        it('should create monitoring station with optional fields as null', async () => {
            const createDtoWithoutOptional = {
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
            };
            const mockStationWithoutOptional = {
                id: 1,
                ...createDtoWithoutOptional,
                description: null,
                address: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.create.mockResolvedValue(mockStationWithoutOptional);

            const result = await service.create(createDtoWithoutOptional as CreateMonitoringStationDto);

            expect(prisma.monitoringStation.create).toHaveBeenCalledWith({
                data: {
                    ...createDtoWithoutOptional,
                    description: null,
                    address: null,
                    isActive: true,
                },
            });
            expect(result).toEqual(mockStationWithoutOptional);
        });

        it('should set isActive to true by default', async () => {
            const createDtoWithoutIsActive = {
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
            };
            const mockStationWithDefaultActive = {
                id: 1,
                ...createDtoWithoutIsActive,
                description: null,
                address: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.create.mockResolvedValue(mockStationWithDefaultActive);

            await service.create(createDtoWithoutIsActive as CreateMonitoringStationDto);

            expect(prisma.monitoringStation.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    isActive: true,
                }),
            });
        });
    });

    describe('findAll', () => {
        it('should return all active monitoring stations with sensors and alerts', async () => {
            const mockStations = [
                {
                    id: 1,
                    name: 'Station 1',
                    isActive: true,
                    sensors: [{ id: 1, name: 'Sensor 1' }],
                    stationAlerts: [{ id: 1, message: 'Alert 1' }],
                },
                {
                    id: 2,
                    name: 'Station 2',
                    isActive: true,
                    sensors: [{ id: 2, name: 'Sensor 2' }],
                    stationAlerts: [],
                },
            ];

            mockPrismaService.monitoringStation.findMany.mockResolvedValue(mockStations);

            const result = await service.findAll();

            expect(prisma.monitoringStation.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                include: {
                    sensors: true,
                    stationAlerts: true,
                },
            });
            expect(result).toEqual(mockStations);
        });

        it('should return empty array when no active stations', async () => {
            mockPrismaService.monitoringStation.findMany.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findInRadius', () => {
        const radiusDto: GetMonitoringStationInRadiusDto = {
            longitude: -74.0060,
            latitude: 40.7128,
            radius: 10000, // 10km in meters
        };

        const mockStationsInRadius = [
            { id: 1, name: 'Station 1', latitude: 40.7128, longitude: -74.0060 },
            { id: 2, name: 'Station 2', latitude: 40.7138, longitude: -74.0070 },
        ];

        it('should return stations in radius using raw query', async () => {
            mockPrismaService.$queryRaw.mockResolvedValue(mockStationsInRadius);

            const result = await service.findInRadius(radiusDto);

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

            const callArgs = mockPrismaService.$queryRaw.mock.calls[0];

            expect(Array.isArray(callArgs[0])).toBe(true);

            const templateStrings = callArgs[0];
            const sqlQuery = templateStrings.join('?');
            expect(sqlQuery).toContain('SELECT * FROM monitoring_stations');
            expect(sqlQuery).toContain('ST_DWithin');
            expect(sqlQuery).toContain('ST_MakePoint');
            expect(sqlQuery).toContain('isActive = true');

            expect(callArgs[1]).toBe(radiusDto.longitude);
            expect(callArgs[2]).toBe(radiusDto.latitude);
            expect(callArgs[3]).toBe(radiusDto.radius);

            expect(result).toEqual(mockStationsInRadius);
        });

        it('should handle empty result from radius query', async () => {
            mockPrismaService.$queryRaw.mockResolvedValue([]);

            const result = await service.findInRadius(radiusDto);

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should return monitoring station by id', async () => {
            const mockStation = {
                id: 1,
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
                isActive: true,
            };

            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(mockStation);

            const result = await service.findOne(1);

            expect(prisma.monitoringStation.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(result).toEqual(mockStation);
        });

        it('should throw NotFoundException when station not found', async () => {
            mockPrismaService.monitoringStation.findUnique.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(
                new NotFoundException('Monitoring station with ID 999 not found')
            );
        });
    });

    describe('update', () => {
        const updateDto: UpdateMonitoringStationDto = {
            name: 'Updated Station',
            description: 'Updated Description',
        };

        const mockUpdatedStation = {
            id: 1,
            name: 'Updated Station',
            description: 'Updated Description',
            latitude: 40.7128,
            longitude: -74.0060,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should update monitoring station successfully', async () => {
            mockPrismaService.monitoringStation.update.mockResolvedValue(mockUpdatedStation);

            const result = await service.update(1, updateDto);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    ...updateDto,
                    description: updateDto.description,
                },
            });
            expect(result).toEqual(mockUpdatedStation);
        });

        it('should handle undefined optional fields', async () => {
            const updateDtoWithoutOptional = {
                name: 'Updated Station',
            };

            mockPrismaService.monitoringStation.update.mockResolvedValue({
                ...mockUpdatedStation,
                ...updateDtoWithoutOptional,
            });

            await service.update(1, updateDtoWithoutOptional);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    ...updateDtoWithoutOptional,
                },
            });
        });

        it('should throw NotFoundException when station not found', async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'test',
            });

            mockPrismaService.monitoringStation.update.mockRejectedValue(prismaError);

            await expect(service.update(999, updateDto)).rejects.toThrow(
                new NotFoundException('Monitoring station with ID 999 not found')
            );
        });

        it('should rethrow non-P2025 errors', async () => {
            const otherError = new Error('Some other error');

            mockPrismaService.monitoringStation.update.mockRejectedValue(otherError);

            await expect(service.update(1, updateDto)).rejects.toThrow('Some other error');
        });
    });

    describe('remove', () => {
        it('should soft delete monitoring station by setting isActive to false', async () => {
            const mockStation = {
                id: 1,
                name: 'Test Station',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.update.mockResolvedValue(mockStation);

            const result = await service.remove(1);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: false },
            });
            expect(result).toEqual(mockStation);
        });

        it('should throw NotFoundException when station not found during remove', async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'test',
            });

            mockPrismaService.monitoringStation.update.mockRejectedValue(prismaError);

            await expect(service.remove(999)).rejects.toThrow(
                new NotFoundException('Monitoring station with ID 999 not found')
            );
        });
    });

    describe('deactivateStation', () => {
        it('should deactivate monitoring station', async () => {
            const mockStation = {
                id: 1,
                name: 'Test Station',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.update.mockResolvedValue(mockStation);

            const result = await service.deactivateStation(1);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: false },
            });
            expect(result).toEqual(mockStation);
        });

        it('should throw NotFoundException when station not found during deactivation', async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'test',
            });

            mockPrismaService.monitoringStation.update.mockRejectedValue(prismaError);

            await expect(service.deactivateStation(999)).rejects.toThrow(
                new NotFoundException('Monitoring station with ID 999 not found')
            );
        });
    });

    describe('activateStation', () => {
        it('should activate monitoring station', async () => {
            const mockStation = {
                id: 1,
                name: 'Test Station',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.update.mockResolvedValue(mockStation);

            const result = await service.activateStation(1);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: true },
            });
            expect(result).toEqual(mockStation);
        });

        it('should throw NotFoundException when station not found during activation', async () => {
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'test',
            });

            mockPrismaService.monitoringStation.update.mockRejectedValue(prismaError);

            await expect(service.activateStation(999)).rejects.toThrow(
                new NotFoundException('Monitoring station with ID 999 not found')
            );
        });
    });

    // Edge cases
    describe('Edge Cases', () => {
        it('should handle null values in create correctly', async () => {
            const createDtoWithNulls = {
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
                description: null,
                address: null,
                isActive: null,
            };

            const mockStation = {
                id: 1,
                ...createDtoWithNulls,
                isActive: true, // Should be set to true by service
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.create.mockResolvedValue(mockStation);

            await service.create(createDtoWithNulls as CreateMonitoringStationDto);

            expect(prisma.monitoringStation.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    description: null,
                    address: null,
                    isActive: true, // Even when isActive is null in DTO, service sets it to true
                }),
            });
        });

        it('should handle update with only some fields', async () => {
            const partialUpdateDto = {
                name: 'Partially Updated Station',
            };

            const mockStation = {
                id: 1,
                name: 'Partially Updated Station',
                latitude: 40.7128,
                longitude: -74.0060,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.monitoringStation.update.mockResolvedValue(mockStation);

            await service.update(1, partialUpdateDto);

            expect(prisma.monitoringStation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: partialUpdateDto,
            });
        });
    });
});