import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserService } from '../user.service';
import { PasswordService } from '../password.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(LocalStrategy.name);

    constructor(
        private readonly userService: UserService,
        private readonly passwordService: PasswordService,
    ) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
    }

    async validate(email: string, password: string): Promise<any> {
        this.logger.debug(`Attempting to validate credentials for email: ${email}`);

        const user = await this.userService.findByEmail(email);

        // Use generic error message to prevent information leakage
        // Don't reveal whether email exists or if password is set
        if (!user) {
            this.logger.warn(`Login attempt failed: User not found for email: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            this.logger.warn(`Login attempt failed: No password set for user: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.passwordService.verifyPassword(
            user.passwordHash,
            password,
        );

        if (!isPasswordValid) {
            this.logger.warn(`Login attempt failed: Invalid password for user: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.logger.log(`Login successful for user: ${email} (${user.id})`);

        // Return user object (will be attached to request.user)
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            timezone: user.timezone,
        };
    }
}
