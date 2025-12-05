import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../jwt.service';
import { UserService } from '../user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-in-production'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // Ensure it's an access token
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userService.getUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user object (will be attached to request.user)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    };
  }
}

