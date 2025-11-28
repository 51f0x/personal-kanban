import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './modules/worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);
  // eslint-disable-next-line no-console
  console.log('Worker service bootstrapped');
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Worker bootstrap failure', error);
  process.exit(1);
});
