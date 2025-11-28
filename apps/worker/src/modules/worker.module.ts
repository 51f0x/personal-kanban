import { Module } from '@nestjs/common';
import { ConfigModule } from '../shared/config.module';

@Module({
  imports: [ConfigModule],
})
export class WorkerModule {}
