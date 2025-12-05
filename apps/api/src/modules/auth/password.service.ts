import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Service for password hashing and verification using Argon2
 */
@Injectable()
export class PasswordService {
    /**
     * Hash a plain text password using Argon2
     */
    async hashPassword(password: string): Promise<string> {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536, // 64 MB
            timeCost: 3,
            parallelism: 4,
        });
    }

    /**
     * Verify a password against a hash
     */
    async verifyPassword(hash: string, password: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch {
            return false;
        }
    }
}
