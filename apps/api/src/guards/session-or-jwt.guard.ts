import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Guard that accepts either session (web) or JWT (extensions/mobile) authentication
 * Uses JWT guard as base but also checks for session authentication
 * Respects @Public() decorator according to NestJS authentication patterns
 * Reference: https://docs.nestjs.com/security/authentication
 */
@Injectable()
export class SessionOrJwtGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check if user is already authenticated via session
    if (request.user && request.isAuthenticated && request.isAuthenticated()) {
      return true;
    }

    // Try JWT authentication
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch {
      // If JWT fails and no session, throw error
      if (
        !request.user ||
        !request.isAuthenticated ||
        !request.isAuthenticated()
      ) {
        throw new UnauthorizedException("Authentication required");
      }
      return true;
    }
  }
}
