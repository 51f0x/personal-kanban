import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../../shared/config.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
