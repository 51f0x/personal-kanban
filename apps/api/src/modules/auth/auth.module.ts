import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { DatabaseModule } from "@personal-kanban/shared";

import { JwtGuard } from "../../guards/jwt.guard";
import { AuthController } from "./auth.controller";
import { JwtService } from "./jwt.service";
import { PasswordService } from "./password.service";
import { SessionStoreService } from "./session.store";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { SessionStrategy } from "./strategies/session.strategy";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({}),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const expiresIn = config.get<string>("JWT_ACCESS_EXPIRY", "15m");
        return {
          secret: config.get<string>("JWT_SECRET", "change-me-in-production"),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        } as any;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    UserService,
    PasswordService,
    JwtService,
    SessionStoreService,
    LocalStrategy,
    JwtStrategy,
    SessionStrategy,
    // Set up JWT guard as global guard for bearer token authentication
    // All routes are protected by default unless marked with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
  exports: [UserService, PasswordService, JwtService, SessionStoreService],
})
export class AuthModule {}
