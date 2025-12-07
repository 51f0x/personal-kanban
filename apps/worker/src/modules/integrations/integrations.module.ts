import { Module } from '@nestjs/common';
import { CaptureWorkerModule } from '../capture/capture.module';
import { DatabaseModule } from '@personal-kanban/shared';
import { ImapPollerService } from './imap.poller';

@Module({
    imports: [DatabaseModule, CaptureWorkerModule],
    providers: [ImapPollerService],
})
export class IntegrationsModule {}
