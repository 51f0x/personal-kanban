import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService as NestJwtService } from "@nestjs/jwt";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  type: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Service for JWT token generation and validation
 */
@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(userId, email);
    const refreshToken = await this.generateRefreshToken(userId, email);

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token (short-lived)
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      type: "access",
    };

    const expiresIn = this.config.get<string>("JWT_ACCESS_EXPIRY", "15m");
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>("JWT_SECRET"),
      expiresIn: expiresIn as any,
    } as any);
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      type: "refresh",
    };

    const expiresIn = this.config.get<string>("JWT_REFRESH_EXPIRY", "7d");
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>("JWT_SECRET"),
      expiresIn: expiresIn as any,
    } as any);
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>("JWT_SECRET"),
      });

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException("Invalid token payload");
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }
}
