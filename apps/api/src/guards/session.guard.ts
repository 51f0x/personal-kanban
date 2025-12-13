import type { Request } from "express";
import { type ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  login: (user: AuthenticatedUser, callback: (err?: Error) => void) => void;
};

/**
 * Guard for session-based authentication (web)
 * Uses passport-local strategy
 */
@Injectable()
export class SessionGuard extends AuthGuard("local") {
  private readonly logger = new Logger(SessionGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Authenticate with local strategy (this will call LocalStrategy.validate)
      const result = (await super.canActivate(context)) as boolean;

      if (result) {
        const request = context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();

        // Ensure user is set
        if (!request.user) {
          this.logger.error(
            "Authentication succeeded but user not set on request",
          );
          return false;
        }

        // Create session after successful authentication
        await new Promise<void>((resolve, reject) => {
          request.login(request.user, (err?: Error) => {
            if (err) {
              this.logger.error(
                `Failed to create session: ${err.message}`,
                err.stack,
              );
              reject(err);
            } else {
              this.logger.debug(
                `Session created for user: ${request.user.email}`,
              );
              resolve();
            }
          });
        });
      }
      return result;
    } catch (error) {
      // Log detailed error information for debugging
      if (error instanceof Error) {
        this.logger.error(
          `SessionGuard authentication failed: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `SessionGuard authentication failed: ${String(error)}`,
        );
      }
      // Re-throw the error so NestJS can handle it properly (will return 401 for UnauthorizedException)
      throw error;
    }
  }
}
