import { Request as ExpressRequest } from "express";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { JwtService as JwtServiceInstance } from "./jwt.service";
import { PasswordService as PasswordServiceInstance } from "./password.service";
import { UserService as UserServiceInstance } from "./user.service";
import { Public } from "../../decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SetPasswordDto } from "./dto/set-password.dto";

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
  isAuthenticated?: () => boolean;
  logout?: (callback: (err?: Error) => void) => void;
  session?: {
    destroy: (callback: (err?: Error) => void) => void;
  };
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly userService: UserServiceInstance,
    private readonly passwordService: PasswordServiceInstance,
    private readonly jwtService: JwtServiceInstance,
  ) {}

  /**
   * Login endpoint - supports both session (web) and JWT (extensions/mobile)
   * POST /api/v1/auth/login
   * Validates email and password using LocalStrategy and creates session for web clients
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @Public()
  @ApiOperation({
    summary: "Login",
    description:
      "Authenticate user and receive JWT tokens. Supports both session (web) and JWT (extensions/mobile).",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful, returns user info and JWT tokens",
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Request() req: AuthenticatedRequest,
    @Body() loginDto: LoginDto,
  ) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate JWT tokens for API clients
    const tokens = await this.jwtService.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      ...tokens,
    };
  }

  /**
   * Get current authenticated user
   * GET /api/v1/auth/me
   * Supports both session and JWT
   */
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user",
    description:
      "Returns the currently authenticated user information. Supports both session and JWT authentication.",
  })
  @ApiResponse({ status: 200, description: "Current user information" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMe(@Request() req: AuthenticatedRequest) {
    if (!req.user) {
      return null;
    }
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      timezone: req.user.timezone,
    };
  }

  /**
   * Logout endpoint - destroys session
   * POST /api/v1/auth/logout
   * Requires authentication
   */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Logout",
    description: "Destroys the current user session",
  })
  @ApiResponse({ status: 200, description: "Logout successful" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logout(@Request() req: AuthenticatedRequest) {
    if (req.user && req.logout) {
      return new Promise<void>((resolve, reject) => {
        req.logout((err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          if (req.session) {
            req.session.destroy((destroyErr?: Error) => {
              if (destroyErr) reject(destroyErr);
              else resolve();
            });
          } else {
            resolve();
          }
        });
      });
    }
    return { message: "Logged out" };
  }

  /**
   * Refresh JWT token
   * POST /api/v1/auth/refresh
   * Requires authentication - validates refresh token from request body
   * Note: This endpoint requires a valid bearer token to access, then validates the refresh token from body
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Refresh JWT token",
    description:
      "Refresh access and refresh tokens using a valid refresh token",
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: "New token pair generated" })
  @ApiResponse({ status: 400, description: "Invalid token type" })
  @ApiResponse({ status: 401, description: "Invalid or expired token" })
  async refresh(
    @Request() req: AuthenticatedRequest,
    @Body() refreshDto: RefreshTokenDto,
  ) {
    const payload = await this.jwtService.verifyToken(refreshDto.refreshToken);

    if (payload.type !== "refresh") {
      throw new BadRequestException("Invalid token type");
    }

    const user = await this.userService.getUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const tokens = await this.jwtService.generateTokenPair(user.id, user.email);

    return tokens;
  }

  /**
   * Set password for user (for initial setup or password reset)
   * POST /api/v1/auth/set-password
   * Requires authentication (session or JWT)
   */
  @Post("set-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 password changes per minute
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set password",
    description: "Set or update password for the authenticated user",
  })
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({ status: 200, description: "Password updated successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid request or user ID required",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async setPassword(
    @Request() req: AuthenticatedRequest,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    // Since auth is reverted, this endpoint requires userId to be provided in the request body
    // or we need to handle it differently
    if (!req.user) {
      throw new BadRequestException(
        "User ID is required when authentication is disabled",
      );
    }

    const userId = req.user.id;
    const passwordHash = await this.passwordService.hashPassword(
      setPasswordDto.password,
    );
    await this.userService.updatePassword(userId, passwordHash);

    return { message: "Password updated successfully" };
  }
}
