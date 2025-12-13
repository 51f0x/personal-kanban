import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Optional JWT guard - allows requests with or without JWT token
 * Useful for endpoints that work with both authenticated and anonymous users
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    // Don't throw error if no user - just return null
    return user || null;
  }
}
