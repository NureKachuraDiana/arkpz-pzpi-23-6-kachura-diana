import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';
import { UpdateMaintenanceScheduleDto } from './dto/update-maintenance-schedule.dto';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto';
import { MaintenanceScheduleType, NotificationType, AlertSeverity } from '@prisma/client';
import {MaintenanceSchedulesService} from "./maintenance.service";

// Mock implementations
const mockPrismaService = {
  monitoringStation: {
    findUnique: jest.fn(),
  },
  sensor: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  maintenanceSchedule: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

const mockNotificationsService = {
  create: jest.fn(),
};

describe('MaintenanceSchedulesService', () => {
  let service: MaintenanceSchedulesService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceSchedulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<MaintenanceSchedulesService>(MaintenanceSchedulesService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateMaintenanceScheduleDto = {
      title: 'Test Maintenance',
      description: 'Test Description',
      scheduleType: MaintenanceScheduleType.WEEKLY,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-02'),
      stationId: 1,
      sensorId: 1,
      assignedTo: 1,
    };

    const mockMaintenance = {
      id: 1,
      ...createDto,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.monitoringStation.findUnique.mockResolvedValue({ id: 1, name: 'Test Station' });
      mockPrismaService.sensor.findUnique.mockResolvedValue({ id: 1, name: 'Test Sensor' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, name: 'Test User' });
      mockPrismaService.maintenanceSchedule.create.mockResolvedValue(mockMaintenance);
    });

    it('should send notification when assignedTo is provided', async () => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue({
        ...mockMaintenance,
        station: { name: 'Test Station' },
        sensor: { name: 'Test Sensor' }
      });

      await service.create(createDto);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: 1,
        type: NotificationType.INFO,
        title: 'New Maintenance Scheduled: Test Maintenance',
        message: expect.stringContaining('New maintenance'),
        priority: AlertSeverity.MEDIUM,
      });
    });
  });

  describe('findAll', () => {
    it('should return all maintenance schedules ordered by startDate', async () => {
      const mockSchedules = [
        { id: 1, title: 'First', startDate: new Date('2024-01-01') },
        { id: 2, title: 'Second', startDate: new Date('2024-01-02') },
      ];
      mockPrismaService.maintenanceSchedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.findAll();

      expect(prisma.maintenanceSchedule.findMany).toHaveBeenCalledWith({
        orderBy: { startDate: 'asc' },
      });
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('findOne', () => {
    it('should return maintenance schedule by id', async () => {
      const mockSchedule = { id: 1, title: 'Test Maintenance' };
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await service.findOne(1);

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when maintenance not found', async () => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
          new NotFoundException('Maintenance schedule with ID 999 not found')
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateMaintenanceScheduleDto = {
      title: 'Updated Maintenance',
      assignedTo: 2,
    };

    const existingMaintenance = {
      id: 1,
      title: 'Original Maintenance',
      description: 'Original Description',
      scheduleType: MaintenanceScheduleType.WEEKLY,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-02'),
      assignedTo: 1,
      stationId: 1,
      sensorId: 1,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      station: { name: 'Test Station' },
    };

    const updatedMaintenance = {
      ...existingMaintenance,
      ...updateDto,
    };

    beforeEach(() => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(existingMaintenance);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 2, name: 'New User' });
      mockPrismaService.maintenanceSchedule.update.mockResolvedValue(updatedMaintenance);

      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValueOnce(existingMaintenance);
    });

    it('should update maintenance schedule successfully', async () => {
      const result = await service.update(1, updateDto);

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prisma.maintenanceSchedule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateDto,
          stationId: existingMaintenance.stationId,
          sensorId: existingMaintenance.sensorId,
          assignedTo: 2,
        },
      });
      expect(result).toEqual(updatedMaintenance);
    });

    it('should send notification when assignment changes', async () => {
      mockPrismaService.maintenanceSchedule.findUnique
          .mockResolvedValueOnce(existingMaintenance)
          .mockResolvedValueOnce({
            ...updatedMaintenance,
            station: { name: 'Test Station' },
            sensor: { name: 'Test Sensor' }
          });

      await service.update(1, updateDto);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: 2,
        type: NotificationType.INFO,
        title: 'Maintenance Assigned: Updated Maintenance',
        message: expect.stringContaining('You have been assigned to perform maintenance'),
        priority: AlertSeverity.MEDIUM,
      });
    });

    it('should not send notification when assignment does not change', async () => {
      const dtoWithoutAssignmentChange = { title: 'Updated Title' };
      mockPrismaService.maintenanceSchedule.update.mockResolvedValue({
        ...existingMaintenance,
        ...dtoWithoutAssignmentChange,
      });

      await service.update(1, dtoWithoutAssignmentChange);

      expect(notificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const mockSchedule = {
      id: 1,
      title: 'Test Maintenance',
      startDate: new Date(),
      station: { name: 'Test Station' }
    };

    beforeEach(() => {
      mockPrismaService.maintenanceSchedule.findUnique.mockReset();
      mockPrismaService.maintenanceSchedule.delete.mockReset();
    });

    it('should delete maintenance schedule', async () => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrismaService.maintenanceSchedule.delete.mockResolvedValue(mockSchedule);

      await expect(service.remove(1)).resolves.toBeUndefined();

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.maintenanceSchedule.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when maintenance not found', async () => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('assign', () => {
    const assignDto: AssignMaintenanceDto = {
      assignedTo: 2,
    };

    const mockMaintenance = {
      id: 1,
      title: 'Test Maintenance',
      description: 'Test Description',
      scheduleType: MaintenanceScheduleType.WEEKLY,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-02'),
      assignedTo: 1,
      stationId: 1,
      sensorId: 1,
      isCompleted: false,
      station: { name: 'Test Station' },
    };

    beforeEach(() => {
      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(mockMaintenance);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 2, name: 'New User' });
      mockPrismaService.maintenanceSchedule.update.mockResolvedValue({
        ...mockMaintenance,
        assignedTo: 2,
      });
    });

    it('should assign maintenance to user', async () => {
      mockPrismaService.maintenanceSchedule.findUnique
          .mockResolvedValueOnce(mockMaintenance)
          .mockResolvedValueOnce({
            ...mockMaintenance,
            assignedTo: 2,
            station: { name: 'Test Station' },
            sensor: { name: 'Test Sensor' }
          });

      const result = await service.assign(1, assignDto);

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prisma.maintenanceSchedule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { assignedTo: 2 },
      });
      expect(result).toEqual({ ...mockMaintenance, assignedTo: 2 });
    });

    it('should send notification to assigned user', async () => {
      mockPrismaService.maintenanceSchedule.findUnique
          .mockResolvedValueOnce(mockMaintenance)
          .mockResolvedValueOnce({
            ...mockMaintenance,
            assignedTo: 2,
            station: { name: 'Test Station' },
            sensor: { name: 'Test Sensor' }
          });

      await service.assign(1, assignDto);

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: 2,
        type: NotificationType.INFO,
        title: 'Maintenance Assigned: Test Maintenance',
        message: expect.stringContaining('You have been assigned to perform maintenance'),
        priority: AlertSeverity.MEDIUM,
      });
    });
  });

  describe('complete', () => {
    it('should mark maintenance as completed', async () => {
      const mockMaintenance = { id: 1, title: 'Test Maintenance', isCompleted: false };
      const completedMaintenance = { ...mockMaintenance, isCompleted: true };

      mockPrismaService.maintenanceSchedule.findUnique.mockResolvedValue(mockMaintenance);
      mockPrismaService.maintenanceSchedule.update.mockResolvedValue(completedMaintenance);

      const result = await service.complete(1, {});

      expect(prisma.maintenanceSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.maintenanceSchedule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isCompleted: true },
      });
      expect(result).toEqual(completedMaintenance);
    });
  });

  describe('getUpcomingForUser', () => {
    it('should return upcoming maintenance for user', async () => {
      const mockMaintenance = [
        { id: 1, title: 'Upcoming Maintenance', assignedTo: 1, isCompleted: false },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, name: 'Test User' });
      mockPrismaService.maintenanceSchedule.findMany.mockResolvedValue(mockMaintenance);

      const result = await service.getUpcomingForUser(1, 7);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.maintenanceSchedule.findMany).toHaveBeenCalledWith({
        where: {
          assignedTo: 1,
          isCompleted: false,
          startDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: { startDate: 'asc' },
      });
      expect(result).toEqual(mockMaintenance);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUpcomingForUser(999, 7)).rejects.toThrow(
          new NotFoundException('User with ID 999 not found')
      );
    });
  });

  describe('checkUpcomingMaintenance', () => {
    it('should send notifications for upcoming maintenance', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const mockUpcomingMaintenance = [
        {
          id: 1,
          title: 'Tomorrow Maintenance',
          assignedTo: 1,
          startDate: tomorrow,
          station: { name: 'Test Station' },
          sensor: { name: 'Test Sensor' },
        },
      ];

      mockPrismaService.maintenanceSchedule.findMany.mockResolvedValue(mockUpcomingMaintenance);

      await service.checkUpcomingMaintenance();

      expect(prisma.maintenanceSchedule.findMany).toHaveBeenCalledWith({
        where: {
          isCompleted: false,
          startDate: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
          assignedTo: { not: null },
        },
        include: {
          station: { select: { name: true } },
          sensor: { select: { name: true } },
        },
      });

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: 1,
        type: NotificationType.WARNING,
        title: 'Upcoming Maintenance: Tomorrow Maintenance',
        message: expect.any(String),
        priority: AlertSeverity.LOW,
      });
    });

    it('should handle notification errors gracefully', async () => {
      const mockUpcomingMaintenance = [
        {
          id: 1,
          title: 'Tomorrow Maintenance',
          assignedTo: 1,
          startDate: new Date(),
          station: { name: 'Test Station' },
          sensor: { name: 'Test Sensor' },
        },
      ];

      mockPrismaService.maintenanceSchedule.findMany.mockResolvedValue(mockUpcomingMaintenance);
      mockNotificationsService.create.mockRejectedValue(new Error('Notification failed'));

      // Should not throw error
      await expect(service.checkUpcomingMaintenance()).resolves.toBeUndefined();
    });
  });

  describe('findByScheduleType', () => {
    it('should return maintenance by schedule type', async () => {
      const mockMaintenance = [
        { id: 1, title: 'Preventive Maintenance', scheduleType: MaintenanceScheduleType.DAILY },
      ];

      mockPrismaService.maintenanceSchedule.findMany.mockResolvedValue(mockMaintenance);

      const result = await service.findByScheduleType(MaintenanceScheduleType.DAILY);

      expect(prisma.maintenanceSchedule.findMany).toHaveBeenCalledWith({
        where: { scheduleType: MaintenanceScheduleType.DAILY },
        orderBy: { startDate: 'asc' },
      });
      expect(result).toEqual(mockMaintenance);
    });
  });

  describe('getStats', () => {
    it('should return maintenance statistics', async () => {
      const mockCounts = {
        total: 10,
        completed: 5,
        upcoming: 3,
      };

      const mockGroupBy = [
        { scheduleType: MaintenanceScheduleType.DAILY, _count: { _all: 7 } },
        { scheduleType: MaintenanceScheduleType.MONTHLY, _count: { _all: 3 } },
      ];

      mockPrismaService.maintenanceSchedule.count
          .mockResolvedValueOnce(mockCounts.total)
          .mockResolvedValueOnce(mockCounts.completed)
          .mockResolvedValueOnce(mockCounts.upcoming);

      mockPrismaService.maintenanceSchedule.groupBy.mockResolvedValue(mockGroupBy);

      const result = await service.getStats();

      expect(prisma.maintenanceSchedule.count).toHaveBeenCalledTimes(3);
      expect(prisma.maintenanceSchedule.groupBy).toHaveBeenCalledWith({
        by: ['scheduleType'],
        _count: { _all: true },
      });

      expect(result).toEqual({
        total: 10,
        completed: 5,
        upcoming: 3,
        byType: {
          [MaintenanceScheduleType.DAILY]: 7,
          [MaintenanceScheduleType.MONTHLY]: 3,
        },
      });
    });
  });

  // Edge case tests
  describe('Edge Cases', () => {
    it('should handle null stationId and sensorId in create', async () => {
      const createDtoWithoutRelations = {
        title: 'Test Maintenance',
        description: 'Test Description',
        scheduleType: MaintenanceScheduleType.DAILY,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-02'),
      };

      const mockMaintenance = {
        id: 1,
        ...createDtoWithoutRelations,
        stationId: null,
        sensorId: null,
        assignedTo: null,
        isCompleted: false,
      };

      mockPrismaService.maintenanceSchedule.create.mockResolvedValue(mockMaintenance);

      const result = await service.create(createDtoWithoutRelations as any);

      expect(prisma.monitoringStation.findUnique).not.toHaveBeenCalled();
      expect(prisma.sensor.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockMaintenance);
    });

    it('should handle notification failure in create', async () => {
      const createDto = {
        title: 'Test Maintenance',
        scheduleType: MaintenanceScheduleType.DAILY,
        startDate: new Date(),
        assignedTo: 1,
      };

      mockPrismaService.monitoringStation.findUnique.mockResolvedValue(null);
      mockPrismaService.sensor.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.maintenanceSchedule.create.mockResolvedValue({
        id: 1,
        ...createDto,
        stationId: null,
        sensorId: null,
      });

      mockNotificationsService.create.mockRejectedValue(new Error('Notification failed'));

      // Should not throw error
      await expect(service.create(createDto as any)).resolves.toBeDefined();
    });
  });
});
