import { Module } from '@nestjs/common';
import { HealthController } from '../presentation/health.controller';
import { ConfigModule } from '../shared/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
