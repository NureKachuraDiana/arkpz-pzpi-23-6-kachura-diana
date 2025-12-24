import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {SessionService} from "../../session/session.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private sessionService: SessionService,
        private reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if the route is public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromCookie(request);

        if (!token) {
            throw new UnauthorizedException('No session token provided');
        }

        const session = await this.sessionService.validateSession(token);
        if (!session) {
            throw new UnauthorizedException('Invalid or expired session');
        }

        // Add session and user to request object
        request.session = session;
        request.user = {
            id: session.user.id,
            role: session.user.role
        };

        return true;
    }

    private extractTokenFromCookie(request: Request): string | undefined {
        return request.cookies?.session_token;
    }
}