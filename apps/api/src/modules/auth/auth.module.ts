import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { SessionStoreService } from './session.store';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionStrategy } from './strategies/session.strategy';
import { JwtGuard } from '../../guards/jwt.guard';

@Module({
    imports: [
        DatabaseModule,
        PassportModule.register({}),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
                signOptions: {
                    expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
                },
            }),
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
