import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  registerUser(dto: RegisterUserDto) {
    return this.prisma.user.upsert({
      where: { email: dto.email },
      update: { name: dto.name, timezone: dto.timezone ?? 'UTC' },
      create: {
        email: dto.email,
        name: dto.name,
        timezone: dto.timezone ?? 'UTC',
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
}
