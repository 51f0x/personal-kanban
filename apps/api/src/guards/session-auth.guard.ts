import { type ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard for checking if user is authenticated via session
 * Does not trigger authentication, just checks if already authenticated
 */
@Injectable()
export class SessionAuthGuard extends AuthGuard("session") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if user is authenticated via session
    if (request.user && request.isAuthenticated && request.isAuthenticated()) {
      return true;
    }

    // Try to authenticate
    return (await super.canActivate(context)) as boolean;
  }
}
