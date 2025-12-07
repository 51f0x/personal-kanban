import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
    IInterContainerQueue,
    ApiRequest,
    ApiResponse,
    GetUsersRequest,
    GetUsersResponse,
    GetTasksRequest,
    GetTasksResponse,
    GetTaskRequest,
    GetTaskResponse,
    GetColumnsRequest,
    GetColumnsResponse,
    MoveTasksRequest,
    MoveTasksResponse,
    CreateEmailActionTokenRequest,
    CreateEmailActionTokenResponse,
} from '@personal-kanban/shared';

/**
 * BullMQ-based Inter-Container Queue Service
 * Handles request/response communication between API and Worker containers
 */
@Injectable()
export class InterContainerQueueService implements IInterContainerQueue, OnModuleInit {
    private readonly logger = new Logger(InterContainerQueueService.name);
    private readonly redis: Redis;
    private readonly requestQueue: Queue<ApiRequest>;
    private readonly responseQueue: Queue<ApiResponse>;
    private worker?: Worker<ApiRequest>;
    private pendingRequests = new Map<
        string,
        { resolve: (value: any) => void; reject: (error: any) => void }
    >();

    constructor(
        private readonly configService: ConfigService,
        private readonly requestHandler: (request: ApiRequest) => Promise<ApiResponse>,
    ) {
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
        // Start worker to process requests from worker container
        this.worker = new Worker<ApiRequest>(
            'api-requests',
            async (job: Job<ApiRequest>) => {
                try {
                    const response = await this.requestHandler(job.data);
                    return response;
                } catch (error) {
                    this.logger.error(`Error handling request ${job.id}:`, error);
                    throw error;
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

        this.worker.on('completed', async (job: Job<ApiRequest>, result: ApiResponse) => {
            // Send response back to worker
            await this.responseQueue.add(`response-${job.id}`, result, {
                jobId: `response-${job.id}`,
            });
        });

        this.worker.on('failed', (job, err) => {
            this.logger.error(`Request ${job?.id} failed:`, err);
        });

        this.logger.log('Inter-container queue service initialized');
    }

    async request<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        _queue: string,
        _request: TRequest,
        _options?: { timeout?: number },
    ): Promise<TResponse> {
        // This method is for worker to call API
        // Not used in API container
        throw new Error('request() should be called from worker container, not API');
    }

    async send<TRequest extends ApiRequest>(_queue: string, _request: TRequest): Promise<void> {
        // This method is for worker to send requests
        // Not used in API container
        throw new Error('send() should be called from worker container, not API');
    }

    registerHandler<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        _queue: string,
        _handler: (request: TRequest) => Promise<TResponse>,
    ): void {
        // Handler is passed in constructor
        // This is just for interface compliance
    }
}
