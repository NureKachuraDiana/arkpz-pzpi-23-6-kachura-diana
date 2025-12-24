import {Role} from "@prisma/client";


export interface SessionData {
    id: string;
    userId: number;
    token: string;
    expiresAt: Date;
    createdAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    role: Role;
}

export interface RequestWithSession extends Request {
    session: SessionData;
    user?: {
        id: number;
        role: Role;
    };
}