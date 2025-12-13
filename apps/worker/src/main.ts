import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './modules/worker.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(WorkerModule);
    app.enableShutdownHooks();

    const logger = new Logger('WorkerBootstrap');
    logger.log('Worker service bootstrapped');

    // Handle shutdown signals
    process.on('SIGTERM', async () => {
        logger.log('SIGTERM received, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.log('SIGINT received, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
}

bootstrap().catch((error) => {
    const logger = new Logger('WorkerBootstrap');
    logger.error('Worker bootstrap failure', error instanceof Error ? error.stack : String(error));
    process.exit(1);
});
