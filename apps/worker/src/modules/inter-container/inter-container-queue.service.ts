import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
    IInterContainerQueue,
    ApiRequest,
    ApiResponse,
    GetUsersResponse,
    GetTasksResponse,
    GetTaskResponse,
    GetColumnsResponse,
    MoveTasksResponse,
    CreateEmailActionTokenResponse,
} from '@personal-kanban/shared';

/**
 * Worker-side Inter-Container Queue Service
 * Sends requests to API container and receives responses
 */
@Injectable()
export class InterContainerQueueService
    implements IInterContainerQueue, OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(InterContainerQueueService.name);
    private readonly redis: Redis;
    private readonly requestQueue: Queue<ApiRequest>;
    private readonly responseQueue: Queue<ApiResponse>;
    private responseWorker?: Worker<ApiResponse>;
    private pendingRequests = new Map<
        string,
        { resolve: (value: any) => void; reject: (error: any) => void; timeout: NodeJS.Timeout }
    >();

    constructor(private readonly configService: ConfigService) {
        const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        this.redis = new Redis(redisUrl, {
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });

        const connection = {
            host: new URL(redisUrl).hostname,
            port: parseInt(new URL(redisUrl).port || '6379'),
        };

        // Queue for worker -> API requests
        this.requestQueue = new Queue<ApiRequest>('api-requests', { connection });
        // Queue for API -> worker responses
        this.responseQueue = new Queue<ApiResponse>('api-responses', { connection });
    }

    async onModuleInit() {
        // Start worker to receive responses from API
        this.responseWorker = new Worker<ApiResponse>(
            'api-responses',
            async (job: Job<ApiResponse>) => {
                const requestId = job.id?.replace('response-', '');
                if (requestId && this.pendingRequests.has(requestId)) {
                    const pending = this.pendingRequests.get(requestId)!;
                    clearTimeout(pending.timeout);
                    pending.resolve(job.data);
                    this.pendingRequests.delete(requestId);
                }
            },
            {
                connection: {
                    host: new URL(
                        this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
                    ).hostname,
                    port: parseInt(
                        new URL(
                            this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
                        ).port || '6379',
                    ),
                },
            },
        );

        this.responseWorker.on('failed', (job, err) => {
            this.logger.error(`Response ${job?.id} failed:`, err);
        });

        this.logger.log('Inter-container queue service initialized (worker side)');
    }

    async onModuleDestroy() {
        if (this.responseWorker) {
            await this.responseWorker.close();
        }
        await this.requestQueue.close();
        await this.responseQueue.close();
        await this.redis.quit();
    }

    async request<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        _queue: string,
        request: TRequest,
        options?: { timeout?: number },
    ): Promise<TResponse> {
        const timeout = options?.timeout || 30000; // Default 30 seconds

        return new Promise<TResponse>((resolve, reject) => {
            // Generate unique request ID
            const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            // Store pending request
            this.pendingRequests.set(requestId, {
                resolve: resolve as any,
                reject,
                timeout: timeoutHandle,
            });

            // Send request to API
            this.requestQueue
                .add(request.type, request, {
                    jobId: requestId,
                })
                .catch((error) => {
                    clearTimeout(timeoutHandle);
                    this.pendingRequests.delete(requestId);
                    reject(error);
                });
        });
    }

    async send<TRequest extends ApiRequest>(_queue: string, request: TRequest): Promise<void> {
        await this.requestQueue.add(request.type, request);
    }

    registerHandler<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        _queue: string,
        _handler: (request: TRequest) => Promise<TResponse>,
    ): void {
        // Not used on worker side
        throw new Error('registerHandler() should be called from API container, not worker');
    }
}
