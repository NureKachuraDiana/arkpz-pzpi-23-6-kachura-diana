import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionData } from "./interfaces/session.interface";
import {Prisma, Role} from "@prisma/client";

@Injectable()
export class SessionService {
    // 30 days session duration for long-lived sessions
    private readonly SESSION_TTL_HOURS = 30 * 24; // 720 hours = 30 days

    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async createSession(sessionData: Omit<SessionData, 'id' | 'createdAt'>): Promise<SessionData> {
        await this.cleanupExpiredSessions();

        const session = await this.prisma.session.create({
            data: {
                userId: sessionData.userId,
                token: sessionData.token,
                expiresAt: sessionData.expiresAt,
                ipAddress: sessionData.ipAddress,
                userAgent: sessionData.userAgent,
                role: sessionData.role,
            },
        });

        return this.mapToSessionData(session);
    }

    async getSession(token: string): Promise<SessionData | null> {
        await this.cleanupExpiredSessions();

        const session = await this.prisma.session.findUnique({
            where: { token },
        });

        if (!session) {
            return null;
        }

        if (session.expiresAt < new Date()) {
            await this.deleteSession(token);
            return null;
        }

        return this.mapToSessionData(session);
    }

    async getSessionWithUser(token: string): Promise<{ session: SessionData; user: { id: number; role: Role } } | null> {
        const session = await this.getSession(token);

        if (!session) {
            return null;
        }

        return {
            session,
            user: {
                id: session.userId,
                role: session.role,
            },
        };
    }

    async updateSession(token: string, updates: Partial<Omit<SessionData, 'id' | 'token' | 'createdAt'>>): Promise<SessionData> {
        await this.cleanupExpiredSessions();

        const existingSession = await this.prisma.session.findUnique({
            where: { token },
        });

        if (!existingSession) {
            throw new NotFoundException('Session not found');
        }

        const updatedSession = await this.prisma.session.update({
            where: { token },
            data: {
                ...(updates.userId && { userId: updates.userId }),
                ...(updates.expiresAt && { expiresAt: updates.expiresAt }),
                ...(updates.ipAddress !== undefined && { ipAddress: updates.ipAddress }),
                ...(updates.userAgent !== undefined && { userAgent: updates.userAgent }),
                ...(updates.role && { role: updates.role }),
            },
        });

        return this.mapToSessionData(updatedSession);
    }

    async updateUserRoleInAllSessions(userId: number, newRole: Role): Promise<void> {
        await this.prisma.session.updateMany({
            where: {
                userId,
                expiresAt: { gt: new Date() }
            },
            data: { role: newRole },
        });
    }

    async deleteSession(token: string): Promise<void> {
        await this.prisma.session.delete({
            where: { token },
        });
    }

    async deleteAllUserSessions(userId: number): Promise<void> {
        await this.prisma.session.deleteMany({
            where: { userId },
        });
    }

    async extendSession(token: string, extendHours: number = this.SESSION_TTL_HOURS): Promise<SessionData> {
        await this.cleanupExpiredSessions();

        const newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + extendHours);

        const session = await this.prisma.session.update({
            where: { token },
            data: { expiresAt: newExpiresAt },
        });

        return this.mapToSessionData(session);
    }

    async getUserSessions(userId: number): Promise<SessionData[]> {
        await this.cleanupExpiredSessions();

        const findManyArgs: Prisma.SessionFindManyArgs = {
            where: { userId },
            orderBy: { createdAt: 'desc' },
        };

        const sessions = await this.prisma.session.findMany(findManyArgs);
        return sessions.map(session => this.mapToSessionData(session));
    }

    async hasRole(token: string, requiredRole: Role): Promise<boolean> {
        const session = await this.getSession(token);
        if (!session) {
            return false;
        }
        return session.role === requiredRole;
    }

    async hasAnyRole(token: string, requiredRoles: Role[]): Promise<boolean> {
        const session = await this.getSession(token);
        if (!session) {
            return false;
        }
        return requiredRoles.includes(<"OPERATOR" | "ADMIN" | "OBSERVER">session.role);
    }

    async validateSession(token: string): Promise<{ session: SessionData; user: { id: number; role: Role } } | null> {
        const result = await this.getSessionWithUser(token);

        if (!result) {
            return null;
        }

        if (result.session.expiresAt < new Date()) {
            await this.deleteSession(token);
            return null;
        }

        return result;
    }

    async cleanupExpiredSessions(): Promise<void> {
        await this.prisma.session.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }

    private mapToSessionData(session: any): SessionData {
        return {
            id: session.id,
            userId: session.userId,
            token: session.token,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            role: session.role,
        };
    }
}