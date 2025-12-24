import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemEventDto, CreateSystemEventFromServiceDto } from './dto/create-system-event.dto';
import * as os from 'os';
import * as diskusage from 'diskusage';
import * as path from 'path';
import {SystemEventType} from "@prisma/client";

@Injectable()
export class SystemService implements OnModuleInit {
    private readonly logger = new Logger(SystemService.name);
    private systemStartTime: Date;

    constructor(
        private readonly prisma: PrismaService) {
        this.systemStartTime = new Date();
    }

    async onModuleInit() {
        // Log system startup
        await this.createSystemEvent({
            type: SystemEventType.INFO,
            message: 'System service initialized',
            source: 'system_service',
            details: {
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsage: process.memoryUsage(),
            },
        });
    }

    /**
     * Create a system event record
     */
    async createSystemEvent(createDto: CreateSystemEventDto): Promise<any> {
        try {
            const event = await this.prisma.systemEvent.create({
                data: {
                    type: createDto.type,
                    source: createDto.source,
                    message: createDto.message,
                    details: createDto.details || {},
                    createdBy: createDto.createdBy,
                },
                include: {
                    user: createDto.createdBy ? {
                        select: {
                            id: true,
                            email: true,
                        },
                    } : false,
                },
            });

            this.logger.log(`System event created: ${event.type} - ${event.message}`);
            return event;
        } catch (error) {
            this.logger.error(`Failed to create system event: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Create system event from service (for use by other services)
     */
    async logSystemEvent(createDto: CreateSystemEventFromServiceDto, userId?: number): Promise<any> {
        return this.createSystemEvent({
            ...createDto,
            createdBy: userId,
        });
    }

    /**
     * Get all system events with optional filtering
     */
    async getAllEvents(
        type?: SystemEventType,
        source?: string,
        startDate?: Date,
        endDate?: Date,
        limit: number = 100,
    ): Promise<any[]> {
        try {
            const where: any = {};

            if (type) {
                where.type = type;
            }

            if (source) {
                where.source = source;
            }

            if (startDate || endDate) {
                where.createdAt = {};

                if (startDate) {
                    where.createdAt.gte = startDate;
                }

                if (endDate) {
                    where.createdAt.lte = endDate;
                }
            }

            const events = await this.prisma.systemEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

            return events;
        } catch (error) {
            this.logger.error(`Failed to get system events: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get system event by ID
     */
    async getEventById(id: number): Promise<any> {
        try {
            const event = await this.prisma.systemEvent.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

            if (!event) {
                throw new Error(`System event with ID ${id} not found`);
            }

            return event;
        } catch (error) {
            this.logger.error(`Failed to get system event: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Delete system event by ID
     */
    async deleteEvent(id: number): Promise<void> {
        try {
            await this.prisma.systemEvent.delete({
                where: { id },
            });

            this.logger.log(`System event deleted: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to delete system event: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Clean up old system events
     */
    async cleanupOldEvents(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const result = await this.prisma.systemEvent.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                    type: {
                        in: [SystemEventType.INFO, SystemEventType.WARNING],
                    },
                },
            });

            this.logger.log(`Cleaned up ${result.count} old system events`);
            return { deletedCount: result.count };
        } catch (error) {
            this.logger.error(`Failed to cleanup old events: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get system health status
     */
    async getSystemHealth(): Promise<any> {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: await this.checkDatabaseHealth(),
                    disk: await this.checkDiskHealth(),
                    memory: await this.checkMemoryHealth(),
                    cpu: await this.checkCpuHealth(),
                },
                uptime: this.getUptime(),
            };

            // Determine overall status
            const failedChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
            if (failedChecks.length > 0) {
                health.status = 'unhealthy';
            }

            return health;
        } catch (error) {
            this.logger.error(`Failed to get system health: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Check database connection health
     */
    private async checkDatabaseHealth(): Promise<any> {
        try {
            const startTime = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                message: 'Database connection is working',
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database connection failed: ${error.message}`,
            };
        }
    }

    /**
     * Check disk usage health
     */
    private async checkDiskHealth(): Promise<any> {
        try {
            const diskPath = process.cwd();
            const diskInfo = await diskusage.check(diskPath);

            const totalGB = diskInfo.total / (1024 * 1024 * 1024);
            const freeGB = diskInfo.free / (1024 * 1024 * 1024);
            const usedGB = totalGB - freeGB;
            const usagePercentage = (usedGB / totalGB) * 100;

            let status = 'healthy';
            if (usagePercentage > 90) {
                status = 'critical';
            } else if (usagePercentage > 80) {
                status = 'warning';
            }

            return {
                status,
                total: `${totalGB.toFixed(2)} GB`,
                free: `${freeGB.toFixed(2)} GB`,
                used: `${usedGB.toFixed(2)} GB`,
                usagePercentage: usagePercentage.toFixed(2),
                path: diskPath,
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Disk check failed: ${error.message}`,
            };
        }
    }

    /**
     * Check memory usage health
     */
    private async checkMemoryHealth(): Promise<any> {
        try {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const usagePercentage = (usedMemory / totalMemory) * 100;

            let status = 'healthy';
            if (usagePercentage > 90) {
                status = 'critical';
            } else if (usagePercentage > 80) {
                status = 'warning';
            }

            return {
                status,
                total: `${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                free: `${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                used: `${(usedMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                usagePercentage: usagePercentage.toFixed(2),
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Memory check failed: ${error.message}`,
            };
        }
    }

    /**
     * Check CPU health
     */
    private async checkCpuHealth(): Promise<any> {
        try {
            const cpus = os.cpus();
            const loadAverage = os.loadavg();

            // Calculate CPU load as percentage
            const loadPercentage = (loadAverage[0] / cpus.length) * 100;

            let status = 'healthy';
            if (loadPercentage > 90) {
                status = 'critical';
            } else if (loadPercentage > 80) {
                status = 'warning';
            }

            return {
                status,
                cpuCount: cpus.length,
                loadAverage: {
                    '1min': loadAverage[0].toFixed(2),
                    '5min': loadAverage[1].toFixed(2),
                    '15min': loadAverage[2].toFixed(2),
                },
                loadPercentage: loadPercentage.toFixed(2),
                architecture: os.arch(),
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `CPU check failed: ${error.message}`,
            };
        }
    }

    /**
     * Get system uptime
     */
    private getUptime(): any {
        try {
            const uptimeSeconds = process.uptime();

            if (isNaN(uptimeSeconds) || uptimeSeconds <= 0) {
                return {
                    seconds: 0,
                    formatted: "0d 0h 0m 0s",
                    systemStartTime: this.systemStartTime || new Date(),
                    error: "Invalid uptime value"
                };
            }

            const days = Math.floor(uptimeSeconds / (3600 * 24));
            const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);

            return {
                seconds: uptimeSeconds,
                formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
                systemStartTime: this.systemStartTime || new Date(),
                debug: {
                    rawSeconds: uptimeSeconds,
                    days, hours, minutes, seconds
                }
            };
        } catch (error) {
            return {
                seconds: 0,
                formatted: "Error calculating uptime",
                systemStartTime: new Date(),
                error: error.message
            };
        }
    }

    /**
     * Get system usage statistics
     */
    async getSystemStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<any> {
        try {
            const now = new Date();
            let startDate = new Date();

            switch (timeRange) {
                case 'day':
                    startDate.setDate(now.getDate() - 1);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
            }

            // Get event statistics
            const eventStats = await this.prisma.systemEvent.groupBy({
                by: ['type'],
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
                _count: {
                    type: true,
                },
            });

            // Get user statistics
            const totalUsers = await this.prisma.user.count();
            const newUsers = await this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
            });

            // Get activity statistics
            const totalActivities = await this.prisma.userActivityLog.count({
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
            });

            // Get backup statistics
            const backupStats = await this.prisma.systemBackup.groupBy({
                by: ['status'],
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
                _count: {
                    status: true,
                },
            });

            // Get system health history (last 10 checks would be stored elsewhere)
            // For now, we'll just include current health
            const currentHealth = await this.getSystemHealth();

            return {
                timeRange,
                period: {
                    start: startDate,
                    end: now,
                },
                statistics: {
                    events: eventStats,
                    users: {
                        total: totalUsers,
                        new: newUsers,
                    },
                    activities: totalActivities,
                    backups: backupStats,
                },
                currentHealth: currentHealth.checks,
                uptime: currentHealth.uptime,
            };
        } catch (error) {
            this.logger.error(`Failed to get system statistics: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get system event summary for dashboard
     */
    async getEventSummary(limit: number = 10): Promise<any> {
        try {
            const recentEvents = await this.prisma.systemEvent.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

            const eventCounts = await this.prisma.systemEvent.groupBy({
                by: ['type'],
                _count: {
                    type: true,
                },
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    },
                },
            });

            return {
                recentEvents,
                last24Hours: eventCounts,
                totalEvents: await this.prisma.systemEvent.count(),
            };
        } catch (error) {
            this.logger.error(`Failed to get event summary: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Helper method to log error events
     */
    async logError(message: string, source?: string, details?: any, userId?: number): Promise<any> {
        return this.logSystemEvent({
            type: SystemEventType.ERROR,
            message,
            source,
            details,
        }, userId);
    }

    /**
     * Helper method to log warning events
     */
    async logWarning(message: string, source?: string, details?: any, userId?: number): Promise<any> {
        return this.logSystemEvent({
            type: SystemEventType.WARNING,
            message,
            source,
            details,
        }, userId);
    }

    /**
     * Helper method to log info events
     */
    async logInfo(message: string, source?: string, details?: any, userId?: number): Promise<any> {
        return this.logSystemEvent({
            type: SystemEventType.INFO,
            message,
            source,
            details,
        }, userId);
    }

    /**
     * Helper method to log maintenance events
     */
    async logMaintenance(message: string, source?: string, details?: any, userId?: number): Promise<any> {
        return this.logSystemEvent({
            type: SystemEventType.MAINTENANCE,
            message,
            source,
            details,
        }, userId);
    }
}
