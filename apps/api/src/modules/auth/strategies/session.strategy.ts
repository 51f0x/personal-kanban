import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';

/**
 * Session strategy - validates existing session
 * This is used to check if a user is already authenticated via session
 */
@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, 'session') {
  async validate(req: any): Promise<any> {
    // If user is already in session, return it
    if (req.user && req.isAuthenticated && req.isAuthenticated()) {
      return req.user;
    }
    
    // Otherwise, return null (will trigger UnauthorizedException)
    return null;
  }
}

