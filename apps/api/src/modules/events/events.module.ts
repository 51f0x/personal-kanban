import type { IEventBus } from "@personal-kanban/shared";
import { Global, Inject, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  AgentCompletedEvent,
  AgentProgressEvent,
  BoardUpdatedEvent,
  DatabaseModule,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskMovedEvent,
  TaskStaleEvent,
  TaskUpdatedEvent,
} from "@personal-kanban/shared";

import { RealtimeModule } from "../realtime/realtime.module";
import { TaskEventPersistenceHandler } from "./handlers/task-event-persistence.handler";
import { WebSocketEventHandler } from "./handlers/websocket-event.handler";
import { RedisEventBus } from "./infrastructure/redis-event-bus.service";

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, RealtimeModule],
  providers: [
    {
      provide: RedisEventBus,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");
        return new RedisEventBus(redisUrl);
      },
      inject: [ConfigService],
    },
    {
      provide: "IEventBus",
      useExisting: RedisEventBus,
    },
    WebSocketEventHandler,
    TaskEventPersistenceHandler,
  ],
  exports: ["IEventBus"],
})
export class EventsModule {
  constructor(
    @Inject("IEventBus")
    private readonly eventBus: IEventBus,
    private readonly websocketHandler: WebSocketEventHandler,
    private readonly persistenceHandler: TaskEventPersistenceHandler,
  ) {}

  onModuleInit() {
    // Subscribe to all domain events
    this.eventBus.subscribe(TaskCreatedEvent, (event) =>
      this.websocketHandler.handleTaskCreated(event),
    );
    this.eventBus.subscribe(TaskCreatedEvent, (event) =>
      this.persistenceHandler.handleTaskCreated(event),
    );

    this.eventBus.subscribe(TaskMovedEvent, (event) =>
      this.websocketHandler.handleTaskMoved(event),
    );
    this.eventBus.subscribe(TaskMovedEvent, (event) =>
      this.persistenceHandler.handleTaskMoved(event),
    );

    this.eventBus.subscribe(TaskUpdatedEvent, (event) =>
      this.websocketHandler.handleTaskUpdated(event),
    );
    this.eventBus.subscribe(TaskUpdatedEvent, (event) =>
      this.persistenceHandler.handleTaskUpdated(event),
    );

    this.eventBus.subscribe(TaskDeletedEvent, (event) =>
      this.websocketHandler.handleTaskDeleted(event),
    );
    this.eventBus.subscribe(TaskDeletedEvent, (event) =>
      this.persistenceHandler.handleTaskDeleted(event),
    );

    this.eventBus.subscribe(TaskStaleEvent, (event) =>
      this.websocketHandler.handleTaskStale(event),
    );
    this.eventBus.subscribe(TaskStaleEvent, (event) =>
      this.persistenceHandler.handleTaskStale(event),
    );

    this.eventBus.subscribe(BoardUpdatedEvent, (event) =>
      this.websocketHandler.handleBoardUpdated(event),
    );

    this.eventBus.subscribe(AgentProgressEvent, (event) =>
      this.websocketHandler.handleAgentProgress(event),
    );

    this.eventBus.subscribe(AgentCompletedEvent, (event) =>
      this.websocketHandler.handleAgentCompleted(event),
    );
  }
}
