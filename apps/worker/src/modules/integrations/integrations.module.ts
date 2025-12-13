import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { CaptureWorkerModule } from '../capture/capture.module';
import { ImapPollerService } from './imap.poller';

@Module({
    imports: [DatabaseModule, CaptureWorkerModule],
    providers: [ImapPollerService],
})
export class IntegrationsModule {}
