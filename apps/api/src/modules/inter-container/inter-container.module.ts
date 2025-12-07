import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InterContainerQueueService } from './inter-container-queue.service';
import { ApiRequestHandlerService } from './api-request-handler.service';
import { DatabaseModule } from '@personal-kanban/shared';

@Global()
@Module({
    imports: [ConfigModule, DatabaseModule],
    providers: [
        ApiRequestHandlerService,
        {
            provide: InterContainerQueueService,
            useFactory: (configService: ConfigService, handler: ApiRequestHandlerService) => {
                return new InterContainerQueueService(configService, (request) =>
                    handler.handleRequest(request),
                );
            },
            inject: [ConfigService, ApiRequestHandlerService],
        },
    ],
    exports: [InterContainerQueueService, ApiRequestHandlerService],
})
export class InterContainerModule {}
