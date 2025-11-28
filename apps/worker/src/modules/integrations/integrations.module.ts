import { Module } from '@nestjs/common';
import { CaptureModule } from '../capture/capture.module';
import { DatabaseModule } from '../database/database.module';
import { ImapPollerService } from './imap.poller';

@Module({
  imports: [DatabaseModule, CaptureModule],
  providers: [ImapPollerService],
})
export class IntegrationsModule {}
