import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { RegisterUserDto } from './dto/register-user.dto';
import { PasswordService } from './password.service';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
    ) {}

    async registerUser(dto: RegisterUserDto) {
        // Hash password if provided
        let passwordHash: string | undefined;
        if (dto.password) {
            passwordHash = await this.passwordService.hashPassword(dto.password);
        }

        return this.prisma.user.upsert({
            where: { email: dto.email },
            update: {
                name: dto.name,
                timezone: dto.timezone ?? 'UTC',
                ...(passwordHash && { passwordHash }),
            },
            create: {
                email: dto.email,
                name: dto.name,
                timezone: dto.timezone ?? 'UTC',
                passwordHash,
                boards: {
                    create: {
                        name: `${dto.name.split(' ')[0] ?? 'My'} board`,
                        columns: {
                            create: [
                                { name: 'Input', type: 'INPUT', position: 0 },
                                { name: 'Next actions', type: 'CLARIFY', position: 1 },
                                { name: 'In progress', type: 'CONTEXT', position: 2 },
                                { name: 'Done', type: 'DONE', position: 99 },
                            ],
                        },
                    },
                },
            },
            include: {
                boards: {
                    include: { columns: true },
                },
            },
        });
    }

    listUsers() {
        return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    }

    getUser(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async updatePassword(userId: string, passwordHash: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
    }
}
