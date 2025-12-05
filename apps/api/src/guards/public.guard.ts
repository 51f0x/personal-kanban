import { Injectable } from '@nestjs/common';
import type { ExecutionContext, CanActivate } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that allows public access to endpoints marked with @Public()
 * This is a simple guard that bypasses authentication for public endpoints
 * According to NestJS docs: https://docs.nestjs.com/security/authentication
 */
@Injectable()
export class PublicGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If endpoint is marked as public, allow access
        return isPublic ?? false;
    }
}
