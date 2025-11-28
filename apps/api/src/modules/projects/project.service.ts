import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  createProject(input: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        boardId: input.boardId,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        desiredOutcome: input.desiredOutcome,
      },
    });
  }

  listProjects(boardId: string) {
    return this.prisma.project.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
      include: { tasks: true },
    });
  }

  updateProject(input: UpdateProjectInput) {
    const { id, ...data } = input;
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  getProject(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { tasks: true },
    });
  }
}
