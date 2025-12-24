import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertInternalDto } from './dto/create-alert-internal.dto';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto';
import { ClearHistoryDto } from './dto/clear-history.dto';
import { StationAlertDto } from './dto/station-alert.dto';
import { SensorType, AlertSeverity } from '@prisma/client';

@Injectable()
export class StationAlertService {
    private readonly logger = new Logger(StationAlertService.name);
    constructor(
        private readonly prisma: PrismaService,
        // @Inject('NotifyService') private readonly notifyService: NotifyService, // TODO: connect NotifyService
    ) {}

    /**
     * Internal method to create alerts when thresholds are exceeded
     * Uses transaction to prevent duplicate active alerts for same station+sensorType+severity
     * If similar active alert exists, updates the existing one instead of creating duplicate
     */
    async createAlertIfThresholdExceeded(
        payload: CreateAlertInternalDto,
    ): Promise<StationAlertDto> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // Check for existing active alert for same station, sensor type and severity
                const existingAlert = await tx.stationAlert.findFirst({
                    where: {
                        stationId: payload.stationId,
                        sensorType: payload.sensorType,
                        severity: payload.severity,
                        isActive: true,
                        // Optional: also match sensorId if provided for more granular deduplication
                        ...(payload.sensorId && { sensorId: payload.sensorId }),
                    },
                });

                let alert: any;

                // Generate message if not provided
                const message = payload.message || `Sensor ${payload.sensorType} reading ${payload.value} exceeded threshold ${payload.thresholdValue}`;

                if (existingAlert) {
                    // Update existing alert with new values and reset resolvedAt
                    alert = await tx.stationAlert.update({
                        where: { id: existingAlert.id },
                        data: {
                            value: payload.value,
                            thresholdValue: payload.thresholdValue,
                            message: message,
                            resolvedAt: null, // Reset resolution since threshold is exceeded again
                            // Keep existing acknowledged status if user hasn't acknowledged yet
                            ...(existingAlert.acknowledged && {
                                acknowledged: false,
                                acknowledgedBy: null,
                                acknowledgedAt: null,
                            }),
                        },
                    });
                    this.logger.log(`Updated existing alert ${alert.id} for station ${payload.stationId}`);
                } else {
                    // Create new alert
                    alert = await tx.stationAlert.create({
                        data: {
                            stationId: payload.stationId,
                            sensorId: payload.sensorId,
                            sensorType: payload.sensorType,
                            value: payload.value,
                            thresholdValue: payload.thresholdValue,
                            severity: payload.severity,
                            message: message,
                        },
                    });
                    this.logger.log(`Created new alert ${alert.id} for station ${payload.stationId}`);
                }

                // TODO: connect NotifyService
                // this.notifyService.notifyNewAlert(alert);

                return new StationAlertDto(alert);
            });
        } catch (error) {
            this.logger.error(`Failed to create/update alert: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get active alerts with filtering and pagination
     * Uses Prisma indexes on stationId, isActive, createdAt for optimal performance
     */
    async getActiveAlerts(query: GetAlertsQueryDto) {
        const { page = 1, limit = 10, sort = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where = this.buildWhereClause({
            ...filters,
            isActive: true, // Only active alerts
        });

        const [alerts, total] = await Promise.all([
            this.prisma.stationAlert.findMany({
                where,
                include: {
                    station: {
                        select: { name: true, latitude: true, longitude: true },
                    },
                    sensor: {
                        select: { name: true, serialNumber: true },
                    },
                },
                orderBy: { createdAt: sort },
                skip,
                take: limit,
            }),
            this.prisma.stationAlert.count({ where }),
        ]);

        return {
            items: alerts.map(alert => new StationAlertDto(alert)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get alert history (resolved and acknowledged alerts)
     */
    async getAlertHistory(query: GetAlertsQueryDto) {
        const { page = 1, limit = 10, sort = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where = this.buildWhereClause(filters);

        const [alerts, total] = await Promise.all([
            this.prisma.stationAlert.findMany({
                where,
                include: {
                    station: {
                        select: { name: true, latitude: true, longitude: true },
                    },
                    sensor: {
                        select: { name: true, serialNumber: true },
                    },
                },
                orderBy: { createdAt: sort },
                skip,
                take: limit,
            }),
            this.prisma.stationAlert.count({ where }),
        ]);

        return {
            items: alerts.map(alert => new StationAlertDto(alert)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Acknowledge an alert - only allowed for active alerts
     */
    async acknowledgeAlert(alertId: number, userId: number): Promise<StationAlertDto> {
        const alert = await this.prisma.stationAlert.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new NotFoundException(`Alert with ID ${alertId} not found`);
        }

        if (!alert.isActive) {
            throw new BadRequestException('Cannot acknowledge a resolved alert');
        }

        const updatedAlert = await this.prisma.stationAlert.update({
            where: { id: alertId },
            data: {
                acknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date(),
            },
            include: {
                station: {
                    select: { name: true, latitude: true, longitude: true },
                },
                sensor: {
                    select: { name: true, serialNumber: true },
                },
            },
        });

        return new StationAlertDto(updatedAlert);
    }

    /**
     * Resolve a specific alert by ID
     * Used internally when manual resolution is needed
     */
    async resolveAlert(alertId: number): Promise<StationAlertDto> {
        const alert = await this.prisma.stationAlert.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new NotFoundException(`Alert with ID ${alertId} not found`);
        }

        const resolvedAlert = await this.prisma.stationAlert.update({
            where: { id: alertId },
            data: {
                isActive: false,
                resolvedAt: new Date(),
            },
        });

        return new StationAlertDto(resolvedAlert);
    }

    /**
     * Auto-resolve alerts based on predefined rules
     * Example rule: Resolve alerts where sensor values have been below threshold for 5 minutes
     * This would be called by a cron job periodically
     */
    async autoResolveAlerts(): Promise<number> {
        // Example resolution rule: Find alerts that should be auto-resolved
        // This is a simplified example - in reality, you'd check recent sensor readings
        const resolutionThreshold = new Date();
        resolutionThreshold.setMinutes(resolutionThreshold.getMinutes() - 5); // 5 minutes ago

        const result = await this.prisma.stationAlert.updateMany({
            where: {
                isActive: true,
                // Add your specific auto-resolution conditions here
                // Example: Check if latest readings are below threshold (pseudo-condition)
                // This would require joining with sensor readings table
                createdAt: { lt: resolutionThreshold },
                // In real implementation, you'd check actual sensor values vs thresholds
            },
            data: {
                isActive: false,
                resolvedAt: new Date(),
            },
        });

        return result.count;
    }

    /**
     * Clear historical alerts based on criteria
     * Admin only - protected by Roles decorator in controller
     */
    async clearHistory(clearHistoryDto: ClearHistoryDto): Promise<{ deletedCount: number }> {
        const where: any = {};

        if (clearHistoryDto.olderThan) {
            where.createdAt = { lt: new Date(clearHistoryDto.olderThan) };
        }

        if (clearHistoryDto.resolved !== undefined) {
            where.isActive = !clearHistoryDto.resolved;
        }

        const result = await this.prisma.stationAlert.deleteMany({
            where,
        });

        return { deletedCount: result.count };
    }

    /**
     * Build Prisma where clause from query filters
     * Handles stationId, sensorType, severity, isActive, and date ranges
     */
    private buildWhereClause(filters: Partial<GetAlertsQueryDto>) {
        const where: any = {};

        if (filters.stationId !== undefined && filters.stationId !== null) {
            // Convert stationId to number if it's a string
            where.stationId = typeof filters.stationId === 'string' 
                ? parseInt(filters.stationId, 10) 
                : filters.stationId;
        }

        if (filters.sensorType) {
            where.sensorType = filters.sensorType;
        }

        if (filters.severity) {
            where.severity = filters.severity;
        }

        if (filters.isActive !== undefined && filters.isActive !== null) {
            // Convert isActive to boolean if it's a string
            where.isActive = typeof filters.isActive === 'string' 
                ? filters.isActive === 'true' 
                : filters.isActive;
        }

        // Date range filtering
        if (filters.from || filters.to) {
            where.createdAt = {};
            if (filters.from) {
                where.createdAt.gte = new Date(filters.from);
            }
            if (filters.to) {
                where.createdAt.lte = new Date(filters.to);
            }
        }

        return where;
    }
}