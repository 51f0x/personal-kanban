import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@personal-kanban/shared";
import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Public } from "../decorators/public.decorator";

interface HealthCheckResult {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version?: string;
  checks?: {
    database?: { status: "ok" | "error"; latencyMs?: number; error?: string };
    redis?: { status: "ok" | "error"; latencyMs?: number; error?: string };
  };
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Liveness probe - always returns 200 if the service is running
   * Used by container orchestrators to check if the container should be restarted
   */
  @Get("live")
  @Public()
  @ApiOperation({
    summary: "Liveness probe",
    description:
      "Returns 200 if the service is running. Used by container orchestrators.",
  })
  @ApiResponse({ status: 200, description: "Service is alive" })
  getLiveness(): { status: "ok"; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - checks if the service can handle requests
   * Used by load balancers to determine if traffic should be routed to this instance
   */
  @Get("ready")
  @Public()
  @ApiOperation({
    summary: "Readiness probe",
    description:
      "Checks if the service can handle requests. Used by load balancers.",
  })
  @ApiResponse({ status: 200, description: "Service is ready" })
  @ApiResponse({ status: 503, description: "Service is not ready" })
  async getReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult["checks"] = {};
    let overallStatus: "ok" | "degraded" | "error" = "ok";

    // Check database
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "ok",
        latencyMs: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: "error",
        error:
          error instanceof Error ? error.message : "Database connection failed",
      };
      overallStatus = "error";
    }

    // Check Redis (if configured)
    const redisUrl = this.config.get<string>("REDIS_URL");
    if (redisUrl) {
      try {
        const redisStart = Date.now();
        // Simple Redis check via TCP connection test
        const url = new URL(redisUrl);
        const net = await import("node:net");
        await new Promise<void>((resolve, reject) => {
          const socket = net.createConnection(
            {
              host: url.hostname,
              port: Number.parseInt(url.port || "6379"),
              timeout: 2000,
            },
            () => {
              socket.end();
              resolve();
            },
          );
          socket.on("error", reject);
          socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Redis connection timeout"));
          });
        });
        checks.redis = {
          status: "ok",
          latencyMs: Date.now() - redisStart,
        };
      } catch (error) {
        checks.redis = {
          status: "error",
          error:
            error instanceof Error ? error.message : "Redis connection failed",
        };
        // Redis failure is degraded, not full error (captures still work)
        if (overallStatus === "ok") {
          overallStatus = "degraded";
        }
      }
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      checks,
    };

    if (overallStatus === "error") {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  /**
   * Simple health check for backward compatibility
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: "Health check",
    description: "Simple health check endpoint for backward compatibility",
  })
  @ApiResponse({ status: 200, description: "Health check result" })
  @ApiResponse({ status: 503, description: "Service is unhealthy" })
  async getStatus(): Promise<HealthCheckResult> {
    return this.getReadiness();
  }
}
