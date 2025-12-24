// src/user-activity-log/user-activity-log.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserActivityLogDto } from './dto/create-user-activity-log.dto';
import { Request } from 'express';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserActivityLogService {
    private readonly logger = new Logger(UserActivityLogService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a user activity log
     */
    async createLog(createDto: CreateUserActivityLogDto): Promise<any> {
        try {
            const log = await this.prisma.userActivityLog.create({
                data: {
                    userId: createDto.userId,
                    action: createDto.action,
                    resource: createDto.resource,
                    ipAddress: createDto.ipAddress,
                    userAgent: createDto.userAgent,
                    metadata: createDto.metadata || Prisma.JsonNull,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true
                        },
                    },
                },
            });

            this.logger.debug(`User activity log created: ${log.action} for user ${log.userId}`);
            return log;
        } catch (error) {
            this.logger.error(`Failed to create user activity log: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Create log from HTTP request with automatic IP and user agent extraction
     */
    async createLogFromRequest(
        userId: number,
        action: string,
        resource?: string,
        request?: Request,
        metadata?: any,
    ): Promise<any> {
        try {
            let ipAddress: string | null = null;
            let userAgent: string | null = null;

            if (request) {
                ipAddress = this.getClientIp(request);
                userAgent = request.headers['user-agent'] || null;
            }

            const logData = {
                userId,
                action,
                resource: resource || (request ? request.originalUrl : null),
                ipAddress,
                userAgent,
                metadata: metadata || Prisma.JsonNull,
            };

            const log = await this.prisma.userActivityLog.create({
                data: logData,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

            this.logger.debug(`User activity log created: ${log.action} for user ${log.userId}`);
            return log;
        } catch (error) {
            this.logger.error(`Failed to create user activity log: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get all logs for a specific user
     */
    async getUserLogs(userId: number): Promise<any[]> {
        try {
            const logs = await this.prisma.userActivityLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true
                        },
                    },
                },
            });

            return logs;
        } catch (error) {
            this.logger.error(`Failed to get user logs for user ${userId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get all activity logs (for admin purposes)
     */
    async getAllLogs(): Promise<any[]> {
        try {
            const logs = await this.prisma.userActivityLog.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true
                        },
                    },
                },
            });

            return logs;
        } catch (error) {
            this.logger.error(`Failed to get all activity logs: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get a single log by ID
     */
    async getLogById(id: number): Promise<any> {
        try {
            const log = await this.prisma.userActivityLog.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true
                        },
                    },
                },
            });

            if (!log) {
                throw new NotFoundException(`User activity log with ID ${id} not found`);
            }

            return log;
        } catch (error) {
            this.logger.error(`Failed to get user activity log: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Delete a log by ID
     */
    async deleteLog(id: number): Promise<void> {
        try {
            const log = await this.prisma.userActivityLog.findUnique({
                where: { id },
            });

            if (!log) {
                throw new NotFoundException(`User activity log with ID ${id} not found`);
            }

            await this.prisma.userActivityLog.delete({
                where: { id },
            });

            this.logger.debug(`User activity log deleted: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to delete user activity log: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Clean up old logs (for maintenance)
     */
    async cleanupOldLogs(daysToKeep: number = 90): Promise<{ deletedCount: number }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const result = await this.prisma.userActivityLog.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
            });

            this.logger.log(`Cleaned up ${result.count} user activity logs older than ${daysToKeep} days`);

            return {
                deletedCount: result.count,
            };
        } catch (error) {
            this.logger.error(`Failed to cleanup old logs: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get client IP address from request
     */
    private getClientIp(request: Request): string | null {
        const forwarded = request.headers['x-forwarded-for'];

        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }

        if (Array.isArray(forwarded)) {
            return forwarded[0].trim();
        }

        return request.ip || null;
    }

    /**
     * Helper method to log user login
     */
    async logLogin(userId: number, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'LOGIN',
            '/api/auth/login',
            request,
            metadata,
        );
    }

    /**
     * Helper method to log user logout
     */
    async logLogout(userId: number, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'LOGOUT',
            '/api/auth/logout',
            request,
            metadata,
        );
    }

    /**
     * Helper method to log resource creation
     */
    async logCreate(userId: number, resource: string, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'CREATE',
            resource,
            request,
            metadata,
        );
    }

    /**
     * Helper method to log resource update
     */
    async logUpdate(userId: number, resource: string, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'UPDATE',
            resource,
            request,
            metadata,
        );
    }

    /**
     * Helper method to log resource deletion
     */
    async logDelete(userId: number, resource: string, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'DELETE',
            resource,
            request,
            metadata,
        );
    }

    /**
     * Helper method to log resource reading
     */
    async logRead(userId: number, resource: string, request?: Request, metadata?: any): Promise<any> {
        return this.createLogFromRequest(
            userId,
            'READ',
            resource,
            request,
            metadata,
        );
    }
}