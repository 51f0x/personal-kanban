# Architecture Refactoring Examples

This document provides concrete code examples showing how to refactor the current architecture to follow SOLID principles and best practices.

## Table of Contents

1. [Repository Pattern Implementation](#repository-pattern-implementation)
2. [Domain Events Implementation](#domain-events-implementation)
3. [Use Case Pattern Implementation](#use-case-pattern-implementation)
4. [Rich Domain Model Implementation](#rich-domain-model-implementation)
5. [Complete Refactored Example](#complete-refactored-example)

---

## Repository Pattern Implementation

### Current Code (Anti-Pattern)

```typescript
// apps/api/src/modules/tasks/task.service.ts
@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService, // Direct infrastructure dependency
        private readonly boardGateway: BoardGateway,
        private readonly wipService: WipService,
        private readonly llmService: LlmService,
    ) {}
    
    async createTask(input: CreateTaskDto) {
        // Business logic mixed with data access
        return this.prisma.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    boardId: input.boardId,
                    columnId: input.columnId,
                    title: input.title,
                    // ...
                },
            });
            
            await tx.taskEvent.create({
                data: {
                    taskId: task.id,
                    boardId: task.boardId,
                    type: TaskEventType.CREATED,
                    // ...
                },
            });
            
            this.boardGateway.emitBoardUpdate(task.boardId, {
                type: 'task.created',
                taskId: task.id,
            });
            
            return task;
        });
    }
}
```

### Refactored Code (SOLID Compliant)

#### Step 1: Define Repository Interface (Domain Layer)

```typescript
// apps/api/src/modules/tasks/domain/repositories/task.repository.interface.ts
import { Task } from '../entities/task.entity';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../../boards/domain/value-objects/board-id.vo';

export interface ITaskRepository {
    findById(id: TaskId): Promise<Task | null>;
    findByBoardId(boardId: BoardId): Promise<Task[]>;
    save(task: Task): Promise<void>;
    delete(id: TaskId): Promise<void>;
    exists(id: TaskId): Promise<boolean>;
    countByColumnId(columnId: string, excludeTaskId?: TaskId): Promise<number>;
}
```

#### Step 2: Implement Repository (Infrastructure Layer)

```typescript
// apps/api/src/modules/tasks/infrastructure/repositories/prisma-task.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { Task } from '../../domain/entities/task.entity';
import { TaskId } from '../../domain/value-objects/task-id.vo';
import { BoardId } from '../../../boards/domain/value-objects/board-id.vo';
import { TaskMapper } from '../mappers/task.mapper';

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
    constructor(private readonly prisma: PrismaService) {}
    
    async findById(id: TaskId): Promise<Task | null> {
        const data = await this.prisma.task.findUnique({
            where: { id: id.value },
            include: {
                checklist: { orderBy: { position: 'asc' } },
                tags: { include: { tag: true } },
                hints: {
                    orderBy: [
                        { applied: 'asc' },
                        { confidence: 'desc' },
                        { createdAt: 'desc' },
                    ],
                },
            },
        });
        
        return data ? TaskMapper.toDomain(data) : null;
    }
    
    async findByBoardId(boardId: BoardId): Promise<Task[]> {
        const data = await this.prisma.task.findMany({
            where: { boardId: boardId.value },
            include: {
                column: true,
                project: true,
                tags: { include: { tag: true } },
                hints: {
                    orderBy: [
                        { applied: 'asc' },
                        { confidence: 'desc' },
                        { createdAt: 'desc' },
                    ],
                },
            },
            orderBy: [
                { columnId: 'asc' },
                { position: 'asc' },
                { lastMovedAt: 'asc' },
            ],
        });
        
        return data.map(TaskMapper.toDomain);
    }
    
    async save(task: Task): Promise<void> {
        const persistence = TaskMapper.toPersistence(task);
        
        await this.prisma.task.upsert({
            where: { id: task.id.value },
            create: persistence.create,
            update: persistence.update,
        });
        
        // Save related entities (tags, checklist, etc.)
        // Handle in transaction if needed
    }
    
    async delete(id: TaskId): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.taskEvent.deleteMany({ where: { taskId: id.value } });
            await tx.checklistItem.deleteMany({ where: { taskId: id.value } });
            await tx.task.delete({ where: { id: id.value } });
        });
    }
    
    async exists(id: TaskId): Promise<boolean> {
        const count = await this.prisma.task.count({
            where: { id: id.value },
        });
        return count > 0;
    }
    
    async countByColumnId(columnId: string, excludeTaskId?: TaskId): Promise<number> {
        return this.prisma.task.count({
            where: {
                columnId,
                ...(excludeTaskId ? { id: { not: excludeTaskId.value } } : {}),
            },
        });
    }
}
```

#### Step 3: Create Mapper for Domain ↔ Persistence

```typescript
// apps/api/src/modules/tasks/infrastructure/mappers/task.mapper.ts
import { Task as PrismaTask } from '@prisma/client';
import { Task } from '../../domain/entities/task.entity';
import { TaskId } from '../../domain/value-objects/task-id.vo';
import { BoardId } from '../../../boards/domain/value-objects/board-id.vo';
import { ColumnId } from '../../../boards/domain/value-objects/column-id.vo';

export class TaskMapper {
    static toDomain(data: PrismaTask & { checklist?: any[]; tags?: any[]; hints?: any[] }): Task {
        return Task.reconstitute({
            id: TaskId.from(data.id),
            boardId: BoardId.from(data.boardId),
            columnId: ColumnId.from(data.columnId),
            ownerId: data.ownerId,
            title: data.title,
            description: data.description,
            context: data.context,
            waitingFor: data.waitingFor,
            dueAt: data.dueAt ? new Date(data.dueAt) : null,
            needsBreakdown: data.needsBreakdown,
            position: data.position,
            isDone: data.isDone,
            stale: data.stale,
            metadata: data.metadata as Record<string, unknown>,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastMovedAt: data.lastMovedAt,
        });
    }
    
    static toPersistence(task: Task): {
        create: any;
        update: any;
    } {
        return {
            create: {
                id: task.id.value,
                boardId: task.boardId.value,
                columnId: task.columnId.value,
                ownerId: task.ownerId,
                title: task.title.value,
                description: task.description?.value ?? null,
                context: task.context,
                waitingFor: task.waitingFor,
                dueAt: task.dueAt,
                needsBreakdown: task.needsBreakdown,
                position: task.position.value,
                isDone: task.isDone,
                stale: task.stale,
                metadata: task.metadata,
                lastMovedAt: task.lastMovedAt,
            },
            update: {
                // Only include changed fields
                columnId: task.columnId.value,
                title: task.title.value,
                description: task.description?.value ?? null,
                context: task.context,
                waitingFor: task.waitingFor,
                dueAt: task.dueAt,
                needsBreakdown: task.needsBreakdown,
                position: task.position.value,
                isDone: task.isDone,
                stale: task.stale,
                metadata: task.metadata,
                lastMovedAt: task.lastMovedAt,
            },
        };
    }
}
```

---

## Domain Events Implementation

### Current Code (Anti-Pattern)

```typescript
// Services directly call infrastructure
this.boardGateway.emitBoardUpdate(task.boardId, {
    type: 'task.created',
    taskId: task.id,
});

await tx.taskEvent.create({
    data: {
        taskId: task.id,
        boardId: task.boardId,
        type: TaskEventType.CREATED,
    },
});
```

### Refactored Code (Event-Driven)

#### Step 1: Domain Event Base Class

```typescript
// apps/api/src/shared/domain/domain-event.base.ts
export abstract class DomainEvent {
    public readonly occurredOn: Date;
    public readonly aggregateId: string;
    
    constructor(aggregateId: string) {
        this.aggregateId = aggregateId;
        this.occurredOn = new Date();
    }
    
    abstract getEventName(): string;
}
```

#### Step 2: Task Domain Events

```typescript
// apps/api/src/modules/tasks/domain/events/task-created.event.ts
import { DomainEvent } from '../../../../shared/domain/domain-event.base';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../../../boards/domain/value-objects/board-id.vo';

export class TaskCreatedEvent extends DomainEvent {
    constructor(
        public readonly taskId: TaskId,
        public readonly boardId: BoardId,
        public readonly title: string,
        public readonly columnId: string,
    ) {
        super(taskId.value);
    }
    
    getEventName(): string {
        return 'task.created';
    }
}

// apps/api/src/modules/tasks/domain/events/task-moved.event.ts
export class TaskMovedEvent extends DomainEvent {
    constructor(
        public readonly taskId: TaskId,
        public readonly boardId: BoardId,
        public readonly fromColumnId: string,
        public readonly toColumnId: string,
        public readonly position: number,
    ) {
        super(taskId.value);
    }
    
    getEventName(): string {
        return 'task.moved';
    }
}
```

#### Step 3: Event Bus Interface

```typescript
// apps/api/src/shared/domain/event-bus.interface.ts
import { DomainEvent } from './domain-event.base';

export interface IEventBus {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: DomainEvent[]): Promise<void>;
}
```

#### Step 4: Event Bus Implementation

```typescript
// apps/api/src/shared/infrastructure/event-bus/redis-event-bus.ts
import { Injectable } from '@nestjs/common';
import { IEventBus } from '../../domain/event-bus.interface';
import { DomainEvent } from '../../domain/domain-event.base';
import { RedisService } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisEventBus implements IEventBus {
    constructor(private readonly redis: RedisService) {}
    
    async publish(event: DomainEvent): Promise<void> {
        await this.redis.publish(
            `domain:${event.getEventName()}`,
            JSON.stringify({
                aggregateId: event.aggregateId,
                occurredOn: event.occurredOn.toISOString(),
                payload: event,
            }),
        );
    }
    
    async publishAll(events: DomainEvent[]): Promise<void> {
        await Promise.all(events.map(event => this.publish(event)));
    }
}
```

#### Step 5: Event Handlers

```typescript
// apps/api/src/modules/tasks/infrastructure/event-handlers/task-created-websocket.handler.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCreatedEvent } from '../../domain/events/task-created.event';
import { BoardGateway } from '../../../realtime/board.gateway';

@Injectable()
export class TaskCreatedWebSocketHandler {
    constructor(private readonly boardGateway: BoardGateway) {}
    
    @OnEvent('task.created')
    async handle(event: TaskCreatedEvent): Promise<void> {
        this.boardGateway.emitBoardUpdate(event.boardId.value, {
            type: 'task.created',
            taskId: event.taskId.value,
            timestamp: event.occurredOn.toISOString(),
        });
    }
}

// apps/api/src/modules/tasks/infrastructure/event-handlers/task-created-persistence.handler.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCreatedEvent } from '../../domain/events/task-created.event';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TaskCreatedPersistenceHandler {
    constructor(private readonly prisma: PrismaService) {}
    
    @OnEvent('task.created')
    async handle(event: TaskCreatedEvent): Promise<void> {
        await this.prisma.taskEvent.create({
            data: {
                taskId: event.taskId.value,
                boardId: event.boardId.value,
                type: 'CREATED',
                toColumnId: event.columnId,
            },
        });
    }
}
```

#### Step 6: Aggregate Root Base Class

```typescript
// apps/api/src/shared/domain/aggregate-root.base.ts
import { DomainEvent } from './domain-event.base';

export abstract class AggregateRoot {
    private domainEvents: DomainEvent[] = [];
    
    protected addDomainEvent(event: DomainEvent): void {
        this.domainEvents.push(event);
    }
    
    public getDomainEvents(): DomainEvent[] {
        return [...this.domainEvents];
    }
    
    public clearDomainEvents(): void {
        this.domainEvents = [];
    }
}
```

---

## Use Case Pattern Implementation

### Current Code (Service with Multiple Responsibilities)

```typescript
// TaskService does everything
export class TaskService {
    async createTask() { /* CRUD + LLM + Events + Notifications */ }
    async moveTask() { /* Movement + WIP + Events + Notifications */ }
    async deleteTask() { /* Deletion + Events + Notifications */ }
    async getStaleTasks() { /* Query logic */ }
    async markStale() { /* Update + Events */ }
}
```

### Refactored Code (Focused Use Cases)

#### Step 1: Create Task Use Case

```typescript
// apps/api/src/modules/tasks/application/use-cases/create-task.use-case.ts
import { Injectable } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { IBoardRepository } from '../../../boards/domain/repositories/board.repository.interface';
import { IEventBus } from '../../../../shared/domain/event-bus.interface';
import { Task } from '../../domain/entities/task.entity';
import { TaskId } from '../../domain/value-objects/task-id.vo';
import { ITaskAnalyzer } from '../../domain/services/task-analyzer.interface';

export class CreateTaskCommand {
    constructor(
        public readonly boardId: string,
        public readonly columnId: string,
        public readonly ownerId: string,
        public readonly title: string,
        public readonly description?: string,
        public readonly context?: string,
        public readonly projectId?: string,
    ) {}
}

@Injectable()
export class CreateTaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly boardRepository: IBoardRepository,
        private readonly eventBus: IEventBus,
        private readonly taskAnalyzer: ITaskAnalyzer,
    ) {}
    
    async execute(command: CreateTaskCommand): Promise<TaskId> {
        // 1. Validate board exists
        const board = await this.boardRepository.findById(
            BoardId.from(command.boardId),
        );
        if (!board) {
            throw new BoardNotFoundException(command.boardId);
        }
        
        // 2. Optional: Analyze task with LLM
        let analysis = null;
        if (command.title) {
            try {
                analysis = await this.taskAnalyzer.analyze(
                    command.title,
                    command.description,
                );
            } catch (error) {
                // Log but don't fail task creation
                console.warn('LLM analysis failed', error);
            }
        }
        
        // 3. Create domain entity
        const task = Task.create({
            boardId: BoardId.from(command.boardId),
            columnId: ColumnId.from(command.columnId),
            ownerId: command.ownerId,
            title: command.title,
            description: command.description,
            context: command.context ?? analysis?.context ?? null,
            waitingFor: analysis?.waitingFor ?? null,
            dueAt: analysis?.dueAt ?? null,
            needsBreakdown: analysis?.needsBreakdown ?? false,
            projectId: command.projectId ? ProjectId.from(command.projectId) : null,
        });
        
        // 4. Persist
        await this.taskRepository.save(task);
        
        // 5. Publish domain events
        await this.eventBus.publishAll(task.getDomainEvents());
        task.clearDomainEvents();
        
        return task.id;
    }
}
```

#### Step 2: Move Task Use Case

```typescript
// apps/api/src/modules/tasks/application/use-cases/move-task.use-case.ts
import { Injectable } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { IColumnRepository } from '../../../boards/domain/repositories/column.repository.interface';
import { IEventBus } from '../../../../shared/domain/event-bus.interface';
import { IWipChecker } from '../../domain/services/wip-checker.interface';

export class MoveTaskCommand {
    constructor(
        public readonly taskId: string,
        public readonly columnId: string,
        public readonly position?: number,
        public readonly forceWipOverride?: boolean,
    ) {}
}

@Injectable()
export class MoveTaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly columnRepository: IColumnRepository,
        private readonly eventBus: IEventBus,
        private readonly wipChecker: IWipChecker,
    ) {}
    
    async execute(command: MoveTaskCommand): Promise<void> {
        // 1. Load task
        const task = await this.taskRepository.findById(
            TaskId.from(command.taskId),
        );
        if (!task) {
            throw new TaskNotFoundException(command.taskId);
        }
        
        // 2. Load target column
        const targetColumn = await this.columnRepository.findById(
            ColumnId.from(command.columnId),
        );
        if (!targetColumn) {
            throw new ColumnNotFoundException(command.columnId);
        }
        
        // 3. Validate board match
        if (!task.boardId.equals(targetColumn.boardId)) {
            throw new CannotMoveToDifferentBoardError();
        }
        
        // 4. Check WIP limit (domain service)
        if (!command.forceWipOverride) {
            const canMove = await this.wipChecker.canMoveTask(task, targetColumn);
            if (!canMove) {
                throw new WipLimitExceededError(
                    targetColumn.name,
                    await this.wipChecker.getCurrentCount(targetColumn, task.id),
                    targetColumn.wipLimit.value,
                );
            }
        }
        
        // 5. Perform move (domain logic in entity)
        const position = command.position ?? await this.calculateNewPosition(targetColumn);
        task.moveToColumn(
            targetColumn.id,
            Position.from(position),
            targetColumn.wipLimit,
        );
        
        // 6. Persist
        await this.taskRepository.save(task);
        
        // 7. Publish events
        await this.eventBus.publishAll(task.getDomainEvents());
        task.clearDomainEvents();
    }
    
    private async calculateNewPosition(column: Column): Promise<number> {
        const count = await this.taskRepository.countByColumnId(column.id.value);
        return count; // Place at end
    }
}
```

#### Step 3: Update Controller to Use Use Cases

```typescript
// apps/api/src/modules/tasks/task.controller.ts
@Controller('tasks')
export class TaskController {
    constructor(
        private readonly createTaskUseCase: CreateTaskUseCase,
        private readonly moveTaskUseCase: MoveTaskUseCase,
        private readonly deleteTaskUseCase: DeleteTaskUseCase,
    ) {}
    
    @Post()
    async create(@Body() dto: CreateTaskDto) {
        const command = new CreateTaskCommand(
            dto.boardId,
            dto.columnId,
            dto.ownerId,
            dto.title,
            dto.description,
            dto.context,
            dto.projectId,
        );
        
        const taskId = await this.createTaskUseCase.execute(command);
        
        return { id: taskId.value };
    }
    
    @Post(':id/move')
    async move(@Param('id') id: string, @Body() dto: MoveTaskDto) {
        const command = new MoveTaskCommand(
            id,
            dto.columnId,
            dto.position,
            dto.forceWipOverride,
        );
        
        await this.moveTaskUseCase.execute(command);
        
        return { success: true };
    }
}
```

---

## Rich Domain Model Implementation

### Current Code (Anemic Domain Model)

```typescript
// Task is just a type, no behavior
type Task = {
    id: string;
    title: string;
    columnId: string;
    // ... other fields
    // No methods, no behavior
}
```

### Refactored Code (Rich Domain Model)

#### Step 1: Value Objects

```typescript
// apps/api/src/modules/tasks/domain/value-objects/task-id.vo.ts
export class TaskId {
    private constructor(private readonly value: string) {
        if (!this.isValid(value)) {
            throw new InvalidTaskIdError(`Invalid task ID: ${value}`);
        }
    }
    
    static from(value: string): TaskId {
        return new TaskId(value);
    }
    
    static generate(): TaskId {
        return new TaskId(uuidv4());
    }
    
    equals(other: TaskId): boolean {
        return this.value === other.value;
    }
    
    toString(): string {
        return this.value;
    }
    
    get value(): string {
        return this.value;
    }
    
    private isValid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
}

// apps/api/src/modules/tasks/domain/value-objects/title.vo.ts
export class Title {
    private constructor(private readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new InvalidTitleError('Title cannot be empty');
        }
        if (value.length > 500) {
            throw new InvalidTitleError('Title cannot exceed 500 characters');
        }
    }
    
    static from(value: string): Title {
        return new Title(value.trim());
    }
    
    equals(other: Title): boolean {
        return this.value === other.value;
    }
    
    toString(): string {
        return this.value;
    }
    
    get value(): string {
        return this.value;
    }
}
```

#### Step 2: Task Entity with Behavior

```typescript
// apps/api/src/modules/tasks/domain/entities/task.entity.ts
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { TaskId } from '../value-objects/task-id.vo';
import { Title } from '../value-objects/title.vo';
import { TaskCreatedEvent } from '../events/task-created.event';
import { TaskMovedEvent } from '../events/task-moved.event';
import { TaskMarkedStaleEvent } from '../events/task-marked-stale.event';

export class Task extends AggregateRoot {
    private constructor(
        private readonly _id: TaskId,
        private _boardId: BoardId,
        private _columnId: ColumnId,
        private _ownerId: string,
        private _title: Title,
        private _description: Description | null,
        private _context: TaskContext | null,
        private _waitingFor: string | null,
        private _dueAt: Date | null,
        private _needsBreakdown: boolean,
        private _position: Position,
        private _isDone: boolean,
        private _stale: boolean,
        private _metadata: Record<string, unknown>,
        private readonly _createdAt: Date,
        private _updatedAt: Date,
        private _lastMovedAt: Date | null,
    ) {
        super();
    }
    
    // Factory method for creation
    static create(props: TaskCreateProps): Task {
        const task = new Task(
            TaskId.generate(),
            props.boardId,
            props.columnId,
            props.ownerId,
            Title.from(props.title),
            props.description ? Description.from(props.description) : null,
            props.context ?? null,
            props.waitingFor ?? null,
            props.dueAt ?? null,
            props.needsBreakdown ?? false,
            Position.initial(),
            false, // isDone
            false, // stale
            props.metadata ?? {},
            new Date(), // createdAt
            new Date(), // updatedAt
            null, // lastMovedAt
        );
        
        // Raise domain event
        task.addDomainEvent(new TaskCreatedEvent(
            task.id,
            task.boardId,
            task.title.value,
            task.columnId.value,
        ));
        
        return task;
    }
    
    // Factory method for reconstitution from persistence
    static reconstitute(props: TaskReconstituteProps): Task {
        return new Task(
            props.id,
            props.boardId,
            props.columnId,
            props.ownerId,
            Title.from(props.title),
            props.description ? Description.from(props.description) : null,
            props.context ?? null,
            props.waitingFor ?? null,
            props.dueAt ?? null,
            props.needsBreakdown,
            Position.from(props.position),
            props.isDone,
            props.stale,
            props.metadata ?? {},
            props.createdAt,
            props.updatedAt,
            props.lastMovedAt,
        );
    }
    
    // Business logic: Move task to different column
    moveToColumn(newColumnId: ColumnId, newPosition: Position, wipLimit: WipLimit): void {
        // Business rule: Cannot move to same column
        if (this.columnId.equals(newColumnId)) {
            // Allow if just reordering within same column
            if (this.position.equals(newPosition)) {
                return; // No change needed
            }
            this.position = newPosition;
            this.updatedAt = new Date();
            return;
        }
        
        // Business rule: Cannot move done tasks (usually)
        // (This could be configurable per board)
        
        const oldColumnId = this.columnId;
        this.columnId = newColumnId;
        this.position = newPosition;
        this.lastMovedAt = new Date();
        this.updatedAt = new Date();
        
        // Raise domain event
        this.addDomainEvent(new TaskMovedEvent(
            this.id,
            this.boardId,
            oldColumnId.value,
            newColumnId.value,
            newPosition.value,
        ));
    }
    
    // Business logic: Mark task as stale
    markStale(): void {
        if (this.isDone) {
            throw new CannotMarkDoneTaskAsStaleError();
        }
        
        this.stale = true;
        this.updatedAt = new Date();
        
        this.addDomainEvent(new TaskMarkedStaleEvent(this.id, this.boardId));
    }
    
    // Business logic: Update title
    updateTitle(newTitle: string): void {
        this.title = Title.from(newTitle);
        this.updatedAt = new Date();
        
        // Could raise TaskUpdatedEvent here
    }
    
    // Getters (read-only access)
    get id(): TaskId { return this._id; }
    get boardId(): BoardId { return this._boardId; }
    get columnId(): ColumnId { return this._columnId; }
    get ownerId(): string { return this._ownerId; }
    get title(): Title { return this._title; }
    get description(): Description | null { return this._description; }
    get isDone(): boolean { return this._isDone; }
    get stale(): boolean { return this._stale; }
    // ... other getters
}
```

---

## Complete Refactored Example

Here's a complete example showing the before/after of creating a task:

### Before (Current Architecture)

```typescript
// Service doing everything
@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardGateway: BoardGateway,
        private readonly wipService: WipService,
        private readonly llmService: LlmService,
    ) {}
    
    async createTask(input: CreateTaskDto) {
        // LLM analysis
        let llmAnalysis = null;
        if (input.title) {
            try {
                llmAnalysis = await this.llmService.analyzeTask(input.title, input.description);
            } catch (error) {
                // Ignore
            }
        }
        
        // Database transaction
        return this.prisma.$transaction(async (tx) => {
            // Create task
            const task = await tx.task.create({
                data: {
                    boardId: input.boardId,
                    columnId: input.columnId,
                    title: input.title,
                    description: input.description,
                    context: input.context ?? llmAnalysis?.context ?? null,
                    // ...
                },
            });
            
            // Create tags
            if (input.tags?.length) {
                await tx.taskTag.createMany({
                    data: input.tags.map((tagId) => ({ taskId: task.id, tagId })),
                });
            }
            
            // Create event
            await tx.taskEvent.create({
                data: {
                    taskId: task.id,
                    boardId: task.boardId,
                    type: TaskEventType.CREATED,
                    toColumnId: task.columnId,
                },
            });
            
            // WebSocket notification
            this.boardGateway.emitBoardUpdate(task.boardId, {
                type: 'task.created',
                taskId: task.id,
            });
            
            return task;
        });
    }
}
```

### After (SOLID-Compliant Architecture)

```typescript
// 1. Domain Entity
export class Task extends AggregateRoot {
    static create(props: TaskCreateProps): Task {
        const task = new Task(/* ... */);
        task.addDomainEvent(new TaskCreatedEvent(/* ... */));
        return task;
    }
}

// 2. Use Case (Application Layer)
@Injectable()
export class CreateTaskUseCase {
    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly boardRepository: IBoardRepository,
        private readonly eventBus: IEventBus,
        private readonly taskAnalyzer: ITaskAnalyzer,
    ) {}
    
    async execute(command: CreateTaskCommand): Promise<TaskId> {
        // Validate
        const board = await this.boardRepository.findById(BoardId.from(command.boardId));
        if (!board) throw new BoardNotFoundException();
        
        // Analyze (optional)
        const analysis = await this.taskAnalyzer.analyze(command.title, command.description)
            .catch(() => null);
        
        // Create domain entity
        const task = Task.create({
            boardId: BoardId.from(command.boardId),
            columnId: ColumnId.from(command.columnId),
            ownerId: command.ownerId,
            title: command.title,
            description: command.description,
            context: command.context ?? analysis?.context ?? null,
        });
        
        // Persist
        await this.taskRepository.save(task);
        
        // Publish events
        await this.eventBus.publishAll(task.getDomainEvents());
        task.clearDomainEvents();
        
        return task.id;
    }
}

// 3. Event Handlers (Infrastructure Layer)
@Injectable()
export class TaskCreatedWebSocketHandler {
    @OnEvent('task.created')
    async handle(event: TaskCreatedEvent) {
        this.boardGateway.emitBoardUpdate(event.boardId.value, {
            type: 'task.created',
            taskId: event.taskId.value,
        });
    }
}

@Injectable()
export class TaskCreatedPersistenceHandler {
    @OnEvent('task.created')
    async handle(event: TaskCreatedEvent) {
        await this.prisma.taskEvent.create({
            data: {
                taskId: event.taskId.value,
                boardId: event.boardId.value,
                type: 'CREATED',
            },
        });
    }
}

// 4. Controller (Presentation Layer)
@Controller('tasks')
export class TaskController {
    constructor(private readonly createTaskUseCase: CreateTaskUseCase) {}
    
    @Post()
    async create(@Body() dto: CreateTaskDto) {
        const command = new CreateTaskCommand(/* ... */);
        const taskId = await this.createTaskUseCase.execute(command);
        return { id: taskId.value };
    }
}
```

---

## Benefits Summary

### Before (Current)
- ❌ Service does everything (CRUD + LLM + Events + Notifications)
- ❌ Direct infrastructure dependencies
- ❌ Hard to test
- ❌ Tight coupling
- ❌ No domain logic encapsulation

### After (Refactored)
- ✅ Single responsibility per use case
- ✅ Domain logic in entities
- ✅ Easy to test (mock interfaces)
- ✅ Loose coupling via events
- ✅ Clear separation of concerns
- ✅ Follows SOLID principles

---

This refactoring provides a clear migration path while maintaining backward compatibility and allowing incremental adoption.
