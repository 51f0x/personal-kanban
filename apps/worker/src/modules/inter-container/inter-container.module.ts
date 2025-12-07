import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterContainerQueueService } from './inter-container-queue.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [InterContainerQueueService],
    exports: [InterContainerQueueService],
})
export class InterContainerModule {}
