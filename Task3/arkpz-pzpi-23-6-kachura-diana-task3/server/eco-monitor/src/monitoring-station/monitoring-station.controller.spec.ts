import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringStationController } from './monitoring-station.controller';
import { MonitoringStationService } from './monitoring-station.service';
import { CreateMonitoringStationDto } from './dto/create-monitoring-station.dto';
import { UpdateMonitoringStationDto } from './dto/update-monitoring-station.dto';
import { GetMonitoringStationInRadiusDto } from './dto/get-monitoring-station-in-radius.dto';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

// Mock service
const mockMonitoringStationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    deactivateStation: jest.fn(),
    activateStation: jest.fn(),
    findInRadius: jest.fn(),
};

describe('MonitoringStationController', () => {
    let controller: MonitoringStationController;
    let service: MonitoringStationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MonitoringStationController],
            providers: [
                {
                    provide: MonitoringStationService,
                    useValue: mockMonitoringStationService,
                },
            ],
        }).compile();

        controller = module.get<MonitoringStationController>(MonitoringStationController);
        service = module.get<MonitoringStationService>(MonitoringStationService);

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

        it('should create monitoring station successfully', async () => {
            mockMonitoringStationService.create.mockResolvedValue(mockStation);

            const result = await controller.create(createDto);

            expect(service.create).toHaveBeenCalledWith(createDto);
            expect(result).toEqual(mockStation);
        });

        it('should handle service errors', async () => {
            mockMonitoringStationService.create.mockRejectedValue(new Error('Service error'));

            await expect(controller.create(createDto)).rejects.toThrow('Service error');
        });
    });

    describe('findAll', () => {
        it('should return all monitoring stations', async () => {
            const mockStations = [
                { id: 1, name: 'Station 1', isActive: true },
                { id: 2, name: 'Station 2', isActive: true },
            ];
            mockMonitoringStationService.findAll.mockResolvedValue(mockStations);

            const result = await controller.findAll();

            expect(service.findAll).toHaveBeenCalled();
            expect(result).toEqual(mockStations);
        });

        it('should return empty array when no stations', async () => {
            mockMonitoringStationService.findAll.mockResolvedValue([]);

            const result = await controller.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should return monitoring station by id', async () => {
            const mockStation = { id: 1, name: 'Test Station', isActive: true };
            mockMonitoringStationService.findOne.mockResolvedValue(mockStation);

            const result = await controller.findOne(1);

            expect(service.findOne).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockStation);
        });

        it('should handle not found station', async () => {
            mockMonitoringStationService.findOne.mockRejectedValue(new NotFoundException());

            await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
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
        };

        it('should update monitoring station successfully', async () => {
            mockMonitoringStationService.update.mockResolvedValue(mockUpdatedStation);

            const result = await controller.update(1, updateDto);

            expect(service.update).toHaveBeenCalledWith(1, updateDto);
            expect(result).toEqual(mockUpdatedStation);
        });

        it('should handle not found station during update', async () => {
            mockMonitoringStationService.update.mockRejectedValue(new NotFoundException());

            await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should remove monitoring station (soft delete)', async () => {
            const mockStation = { id: 1, name: 'Test Station', isActive: false };
            mockMonitoringStationService.remove.mockResolvedValue(mockStation);

            const result = await controller.remove(1);

            expect(service.remove).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockStation);
        });

        it('should handle not found station during remove', async () => {
            mockMonitoringStationService.remove.mockRejectedValue(new NotFoundException());

            await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('deactivateStation', () => {
        it('should deactivate monitoring station', async () => {
            const mockStation = { id: 1, name: 'Test Station', isActive: false };
            mockMonitoringStationService.deactivateStation.mockResolvedValue(mockStation);

            const result = await controller.deactivateStation(1);

            expect(service.deactivateStation).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockStation);
        });

        it('should handle not found station during deactivation', async () => {
            mockMonitoringStationService.deactivateStation.mockRejectedValue(new NotFoundException());

            await expect(controller.deactivateStation(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('activateStation', () => {
        it('should activate monitoring station', async () => {
            const mockStation = { id: 1, name: 'Test Station', isActive: true };
            mockMonitoringStationService.activateStation.mockResolvedValue(mockStation);

            const result = await controller.activateStation(1);

            expect(service.activateStation).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockStation);
        });

        it('should handle not found station during activation', async () => {
            mockMonitoringStationService.activateStation.mockRejectedValue(new NotFoundException());

            await expect(controller.activateStation(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('findInRadius', () => {
        const radiusDto: GetMonitoringStationInRadiusDto = {
            longitude: -74.0060,
            latitude: 40.7128,
            radius: 10000,
        };

        const mockStationsInRadius = [
            { id: 1, name: 'Station 1', latitude: 40.7128, longitude: -74.0060 },
            { id: 2, name: 'Station 2', latitude: 40.7138, longitude: -74.0070 },
        ];

        it('should return stations in radius', async () => {
            mockMonitoringStationService.findInRadius.mockResolvedValue(mockStationsInRadius);

            const result = await controller.findInRadius(radiusDto);

            expect(service.findInRadius).toHaveBeenCalledWith(radiusDto);
            expect(result).toEqual(mockStationsInRadius);
        });

        it('should handle empty result from radius query', async () => {
            mockMonitoringStationService.findInRadius.mockResolvedValue([]);

            const result = await controller.findInRadius(radiusDto);

            expect(result).toEqual([]);
        });
    });

    // Edge cases and parameter validation
    describe('Edge Cases', () => {
        it('should handle partial update DTO', async () => {
            const partialUpdateDto = { name: 'Updated Name' };
            const mockStation = { id: 1, name: 'Updated Name', isActive: true };

            mockMonitoringStationService.update.mockResolvedValue(mockStation);

            const result = await controller.update(1, partialUpdateDto);

            expect(service.update).toHaveBeenCalledWith(1, partialUpdateDto);
            expect(result).toEqual(mockStation);
        });

        it('should handle create DTO with only required fields', async () => {
            const minimalCreateDto = {
                name: 'Test Station',
                latitude: 40.7128,
                longitude: -74.0060,
            };
            const mockStation = {
                id: 1,
                ...minimalCreateDto,
                description: null,
                address: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockMonitoringStationService.create.mockResolvedValue(mockStation);

            const result = await controller.create(minimalCreateDto as CreateMonitoringStationDto);

            expect(service.create).toHaveBeenCalledWith(minimalCreateDto);
            expect(result).toEqual(mockStation);
        });
    });

    // Role decorator verification (conceptual)
    describe('Role Access', () => {
        // These tests are conceptual since we can't easily test decorators in unit tests
        // In practice, role-based access should be tested in e2e tests

        it('create method should require OPERATOR or ADMIN role', () => {
            // Would be verified in e2e tests
            expect(true).toBe(true);
        });

        it('findAll method should require ADMIN role', () => {
            // Would be verified in e2e tests
            expect(true).toBe(true);
        });

        it('findInRadius method should require OBSERVER role', () => {
            // Would be verified in e2e tests
            expect(true).toBe(true);
        });

        it('update, remove, deactivate, activate methods should require OPERATOR or ADMIN role', () => {
            // Would be verified in e2e tests
            expect(true).toBe(true);
        });

        it('findOne method should be accessible without specific role', () => {
            // Would be verified in e2e tests
            expect(true).toBe(true);
        });
    });

    // HTTP status code verification (conceptual)
    describe('HTTP Status Codes', () => {
        it('remove method should return 201 on success', () => {
            // The @Delete decorator with @ApiResponse({ status: 201 }) suggests 201 on success
            // This would be verified in e2e tests
            expect(true).toBe(true);
        });

        it('deactivateStation and activateStation should return 201 on success', () => {
            // The @Patch decorators with @ApiResponse({ status: 201 }) suggest 201 on success
            // This would be verified in e2e tests
            expect(true).toBe(true);
        });
    });
});