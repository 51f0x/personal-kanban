import { Module } from '@nestjs/common';
import { CaptureWorkerModule } from '../capture-worker/capture-worker.module';
import { ImapPollerService } from './imap.poller';

@Module({
    imports: [CaptureWorkerModule],
    providers: [ImapPollerService],
})
export class IntegrationsModule {}
