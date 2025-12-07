/**
 * Inter-Container Queue Interface
 * Defines the contract for queue-based communication between API and Worker containers
 */

export interface IInterContainerQueue {
    /**
     * Send a request to the API container and wait for response
     */
    request<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        queue: string,
        request: TRequest,
        options?: { timeout?: number },
    ): Promise<TResponse>;

    /**
     * Send a request without waiting for response (fire and forget)
     */
    send<TRequest extends ApiRequest>(queue: string, request: TRequest): Promise<void>;

    /**
     * Register a handler for incoming requests
     */
    registerHandler<TRequest extends ApiRequest, TResponse extends ApiResponse>(
        queue: string,
        handler: (request: TRequest) => Promise<TResponse>,
    ): void;
}

/**
 * Request types for API container
 */
export interface GetUsersRequest {
    type: 'get-users';
    filters?: {
        hasEmail?: boolean;
        limit?: number;
    };
}

export interface GetUserRequest {
    type: 'get-user';
    userId: string;
}

export interface GetTasksRequest {
    type: 'get-tasks';
    filters: {
        userId?: string;
        boardId?: string;
        columnId?: string;
        columnType?: string;
        limit?: number;
    };
}

export interface GetTaskRequest {
    type: 'get-task';
    taskId: string;
}

export interface GetBoardsRequest {
    type: 'get-boards';
    filters: {
        ownerId?: string;
        limit?: number;
    };
}

export interface GetBoardRequest {
    type: 'get-board';
    boardId: string;
}

export interface GetColumnsRequest {
    type: 'get-columns';
    filters: {
        boardId: string;
        type?: string;
    };
}

export interface MoveTasksRequest {
    type: 'move-tasks';
    taskIds: string[];
    targetColumnId: string;
    boardId: string;
}

export interface CreateEmailActionTokenRequest {
    type: 'create-email-action-token';
    userId: string;
    taskId: string;
    action: string;
}

export type ApiRequest =
    | GetUsersRequest
    | GetUserRequest
    | GetTasksRequest
    | GetTaskRequest
    | GetBoardsRequest
    | GetBoardRequest
    | GetColumnsRequest
    | MoveTasksRequest
    | CreateEmailActionTokenRequest;

/**
 * Response types
 */
export interface GetUsersResponse {
    users: Array<{
        id: string;
        email: string;
        name: string | null;
    }>;
}

export interface GetUserResponse {
    user: {
        id: string;
        email: string;
        name: string | null;
    } | null;
}

export interface GetTasksResponse {
    tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        boardId: string;
        columnId: string;
        ownerId: string;
        position: number;
        dueAt: Date | null;
        priority: string | null; // TaskPriority enum as string
        duration: string | null; // Duration as string
        boardName?: string;
        columnName?: string;
        priorityScore?: number;
    }>;
}

export interface GetTaskResponse {
    task: {
        id: string;
        title: string;
        description: string | null;
        boardId: string;
        columnId: string;
        ownerId: string;
        position: number;
        metadata: Record<string, unknown> | null;
    } | null;
}

export interface GetBoardsResponse {
    boards: Array<{
        id: string;
        name: string;
        ownerId: string;
    }>;
}

export interface GetBoardResponse {
    board: {
        id: string;
        name: string;
        ownerId: string;
    } | null;
}

export interface GetColumnsResponse {
    columns: Array<{
        id: string;
        name: string;
        type: string;
        boardId: string;
        position: number;
    }>;
}

export interface MoveTasksResponse {
    success: boolean;
    movedCount: number;
}

export interface CreateEmailActionTokenResponse {
    token: string;
}

export type ApiResponse =
    | GetUsersResponse
    | GetUserResponse
    | GetTasksResponse
    | GetTaskResponse
    | GetBoardsResponse
    | GetBoardResponse
    | GetColumnsResponse
    | MoveTasksResponse
    | CreateEmailActionTokenResponse;
