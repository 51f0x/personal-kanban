import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import {
   CanActivate,
   ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * Guard that validates the x-internal-service-token header for internal service-to-service endpoints.
 * If INTERNAL_SERVICE_TOKEN is not configured, the guard allows all requests (for development).
 * This is used for secure communication between the worker service and the API.
 */
@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.config.get<string>("INTERNAL_SERVICE_TOKEN");

    // If no token is configured, allow all requests (for development)
    if (!expectedToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = request.headers["x-internal-service-token"];

    if (!providedToken) {
      throw new UnauthorizedException({
        message: "Missing internal service token",
        code: "INTERNAL_SERVICE_TOKEN_MISSING",
        hint: "Include x-internal-service-token header in your request",
      });
    }

    if (providedToken !== expectedToken) {
      throw new UnauthorizedException({
        message: "Invalid internal service token",
        code: "INTERNAL_SERVICE_TOKEN_INVALID",
      });
    }

    return true;
  }
}
