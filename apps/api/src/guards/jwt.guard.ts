import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard for JWT-based authentication using bearer tokens
 * Uses passport-jwt strategy
 * Allows public endpoints marked with @Public()
 * 
 * This guard validates JWT bearer tokens from the Authorization header:
 * Authorization: Bearer <token>
 */
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, throw an appropriate exception
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;

      if (!authHeader) {
        throw new UnauthorizedException({
          message: 'Missing authorization header',
          code: 'AUTH_HEADER_MISSING',
          hint: 'Include Authorization: Bearer <token> header in your request',
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          message: 'Invalid authorization header format',
          code: 'AUTH_HEADER_INVALID',
          hint: 'Authorization header must be in format: Bearer <token>',
        });
      }

      // Handle specific JWT errors
      if (info) {
        if (info.name === 'TokenExpiredError') {
          throw new UnauthorizedException({
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED',
            hint: 'Please refresh your token or log in again',
          });
        }
        if (info.name === 'JsonWebTokenError') {
          throw new UnauthorizedException({
            message: 'Invalid token',
            code: 'TOKEN_INVALID',
            hint: 'Please check your token and try again',
          });
        }
      }

      throw err || new UnauthorizedException({
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      });
    }

    return user;
  }
}

