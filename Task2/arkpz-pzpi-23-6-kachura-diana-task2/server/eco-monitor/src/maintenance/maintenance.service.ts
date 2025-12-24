import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';
import { UpdateMaintenanceScheduleDto } from './dto/update-maintenance-schedule.dto';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { MaintenanceSchedule, MaintenanceScheduleType, NotificationType, AlertSeverity } from '@prisma/client';

interface MaintenanceForNotification {
  id: number;
  assignedTo: number | null;
  title: string;
  startDate: Date;
  station?: { name: string } | null;
  sensor?: { name: string } | null;
}

@Injectable()
export class MaintenanceSchedulesService {
  constructor(
      private prisma: PrismaService,
      @Inject(NotificationsService)
      private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new maintenance schedule
   */
  async create(createMaintenanceScheduleDto: CreateMaintenanceScheduleDto): Promise<MaintenanceSchedule> {
    const { stationId, sensorId, assignedTo, ...data } = createMaintenanceScheduleDto;

    // Validate station exists if provided
    if (stationId) {
      const station = await this.prisma.monitoringStation.findUnique({
        where: { id: stationId },
      });
      if (!station) {
        throw new NotFoundException(`Station with ID ${stationId} not found`);
      }
    }

    // Validate sensor exists if provided
    if (sensorId) {
      const sensor = await this.prisma.sensor.findUnique({
        where: { id: sensorId },
      });
      if (!sensor) {
        throw new NotFoundException(`Sensor with ID ${sensorId} not found`);
      }
    }

    // Validate assigned user exists if provided
    if (assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedTo },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${assignedTo} not found`);
      }
    }

    const maintenance = await this.prisma.maintenanceSchedule.create({
      data: {
        ...data,
        stationId: stationId || null,
        sensorId: sensorId || null,
        assignedTo: assignedTo || null,
      },
    });

    // Send notification to assigned user if exists
    if (maintenance.assignedTo) {
      await this.sendMaintenanceNotification(maintenance, 'CREATED');
    }

    return maintenance;
  }

  /**
   * Get all maintenance schedules
   */
  async findAll(): Promise<MaintenanceSchedule[]> {
    return this.prisma.maintenanceSchedule.findMany({
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Get maintenance schedule by ID
   */
  async findOne(id: number): Promise<MaintenanceSchedule> {
    const maintenance = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance schedule with ID ${id} not found`);
    }

    return maintenance;
  }

  /**
   * Update maintenance schedule
   */
  async update(id: number, updateMaintenanceScheduleDto: UpdateMaintenanceScheduleDto): Promise<MaintenanceSchedule> {
    // Check if maintenance exists
    const existing = await this.findOne(id);

    const { stationId, sensorId, assignedTo, ...data } = updateMaintenanceScheduleDto;

    // Validate station exists if provided
    if (stationId) {
      const station = await this.prisma.monitoringStation.findUnique({
        where: { id: stationId },
      });
      if (!station) {
        throw new NotFoundException(`Station with ID ${stationId} not found`);
      }
    }

    // Validate sensor exists if provided
    if (sensorId) {
      const sensor = await this.prisma.sensor.findUnique({
        where: { id: sensorId },
      });
      if (!sensor) {
        throw new NotFoundException(`Sensor with ID ${sensorId} not found`);
      }
    }

    // Validate assigned user exists if provided
    if (assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedTo },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${assignedTo} not found`);
      }
    }

    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...data,
        stationId: stationId !== undefined ? stationId : existing.stationId,
        sensorId: sensorId !== undefined ? sensorId : existing.sensorId,
        assignedTo: assignedTo !== undefined ? assignedTo : existing.assignedTo,
      },
    });

    // Send notification if assignment changed
    if (assignedTo && assignedTo !== existing.assignedTo) {
      await this.sendMaintenanceNotification(updated, 'ASSIGNED');
    }

    return updated;
  }

  /**
   * Delete maintenance schedule
   */
  async remove(id: number): Promise<void> {
    // Check if maintenance exists
    await this.findOne(id);

    await this.prisma.maintenanceSchedule.delete({
      where: { id },
    });
  }

  /**
   * Assign maintenance to user
   */
  async assign(id: number, assignDto: AssignMaintenanceDto): Promise<MaintenanceSchedule> {
    const { assignedTo } = assignDto;

    // Check if maintenance exists
    await this.findOne(id);

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignedTo },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${assignedTo} not found`);
    }

    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: { assignedTo },
    });

    // Send notification to assigned user
    await this.sendMaintenanceNotification(updated, 'ASSIGNED');

    return updated;
  }

  /**
   * Mark maintenance as completed
   */
  async complete(id: number, completeDto: CompleteMaintenanceDto): Promise<MaintenanceSchedule> {
    // Check if maintenance exists
    await this.findOne(id);

    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        isCompleted: true,
      },
    });

    return updated;
  }

  /**
   * Get upcoming maintenance for user
   */
  async getUpcomingForUser(userId: number, days: number = 7): Promise<MaintenanceSchedule[]> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.maintenanceSchedule.findMany({
      where: {
        assignedTo: userId,
        isCompleted: false,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Send notification for maintenance event
   */
  private async sendMaintenanceNotification(
      maintenance: MaintenanceForNotification,
      eventType: 'CREATED' | 'ASSIGNED' | 'UPCOMING'
  ): Promise<void> {
    if (!maintenance.assignedTo) return;

    let notificationType: NotificationType;
    let priority: AlertSeverity;
    let title = '';
    let message = '';

    // Get station and sensor names if needed
    let stationName = 'Unknown Station';
    let sensorName = 'Unknown Sensor';

    if (maintenance.station) {
      stationName = maintenance.station.name;
    } else if (maintenance.id) {
      // If station not provided, fetch it
      const maintenanceWithDetails = await this.prisma.maintenanceSchedule.findUnique({
        where: { id: maintenance.id },
        include: {
          station: { select: { name: true } },
          sensor: { select: { name: true } },
        },
      });
      if (maintenanceWithDetails) {
        stationName = maintenanceWithDetails.station?.name || 'Unknown Station';
        sensorName = maintenanceWithDetails.sensor?.name || 'Unknown Sensor';
      }
    }

    switch (eventType) {
      case 'CREATED':
        notificationType = NotificationType.INFO;
        priority = AlertSeverity.MEDIUM;
        title = `New Maintenance Scheduled: ${maintenance.title}`;
        message = `New maintenance "${maintenance.title}" has been scheduled for ${stationName} on ${maintenance.startDate.toLocaleDateString()}`;
        break;

      case 'ASSIGNED':
        notificationType = NotificationType.INFO;
        priority = AlertSeverity.MEDIUM;
        title = `Maintenance Assigned: ${maintenance.title}`;
        message = `You have been assigned to perform maintenance "${maintenance.title}" at ${stationName} on ${maintenance.startDate.toLocaleDateString()}`;
        break;

      case 'UPCOMING':
        notificationType = NotificationType.WARNING;
        priority = AlertSeverity.LOW;
        title = `Upcoming Maintenance: ${maintenance.title}`;
        message = `Reminder: Maintenance "${maintenance.title}" at ${stationName} is scheduled for tomorrow`;
        break;
    }

    try {
      await this.notificationsService.create({
        userId: maintenance.assignedTo,
        type: notificationType,
        title,
        message,
        priority,
      });
    } catch (error) {
      // Log error but don't break the main flow
      console.error('Failed to send maintenance notification:', error);
    }
  }

  /**
   * Check and send notifications for upcoming maintenance
   * This should be called by a scheduled task/cron job
   */
  async checkUpcomingMaintenance(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const upcomingMaintenance = await this.prisma.maintenanceSchedule.findMany({
      where: {
        isCompleted: false,
        startDate: {
          gte: tomorrow,
          lt: dayAfter,
        },
        assignedTo: {
          not: null,
        },
      },
      include: {
        station: { select: { name: true } },
        sensor: { select: { name: true } },
      },
    });

    for (const maintenance of upcomingMaintenance) {
      await this.sendMaintenanceNotification(maintenance, 'UPCOMING');
    }
  }

  /**
   * Get maintenance by schedule type
   */
  async findByScheduleType(scheduleType: MaintenanceScheduleType): Promise<MaintenanceSchedule[]> {
    return this.prisma.maintenanceSchedule.findMany({
      where: { scheduleType },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get maintenance statistics
   */
  async getStats(): Promise<{
    total: number;
    completed: number;
    upcoming: number;
    byType: Record<string, number>;
  }> {
    const [total, completed, upcoming, byType] = await Promise.all([
      this.prisma.maintenanceSchedule.count(),
      this.prisma.maintenanceSchedule.count({
        where: { isCompleted: true },
      }),
      this.prisma.maintenanceSchedule.count({
        where: {
          isCompleted: false,
          startDate: { gte: new Date() },
        },
      }),
      this.prisma.maintenanceSchedule.groupBy({
        by: ['scheduleType'],
        _count: { _all: true },
      }),
    ]);

    const byTypeResult = byType.reduce((acc, item) => {
      acc[item.scheduleType] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      completed,
      upcoming,
      byType: byTypeResult,
    };
  }
}