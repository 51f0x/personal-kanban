import { useEffect, useMemo, useRef } from "react";
import { type Socket, io } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:3000";

export interface AgentProgress {
  stage: string;
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface BoardUpdateEvent {
  type: string;
  taskId?: string;
  boardId?: string;
  progress?: AgentProgress;
  processingTimeMs?: number;
  successfulAgents?: number;
  errors?: string[];
  timestamp: string;
}

export interface UseBoardRealtimeCallbacks {
  onUpdate?: () => void;
  onAgentProgress?: (taskId: string, progress: AgentProgress) => void;
  onAgentCompleted?: (
    taskId: string,
    data: {
      processingTimeMs: number;
      successfulAgents: number;
      errors?: string[];
    },
  ) => void;
}

export function useBoardRealtime(
  boardIds: string[],
  callbacks: UseBoardRealtimeCallbacks,
) {
  const idsKey = useMemo(() => [...boardIds].sort().join(","), [boardIds]);
  const callbacksRef = useRef(callbacks);

  // Keep the ref updated with the latest callbacks
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!boardIds.length) {
      return;
    }

    const socket: Socket = io(`${WS_URL}/boards`, {
      transports: ["websocket"],
    });
    const joinBoards = () => {
      boardIds.forEach((boardId) => {
        socket.emit("join", { boardId });
      });
    };

    socket.on("connect", joinBoards);
    socket.on("board:update", (event: BoardUpdateEvent) => {
      const cbs = callbacksRef.current;

      // Handle specific event types
      if (event.type === "agent.progress" && event.taskId && event.progress) {
        cbs.onAgentProgress?.(event.taskId, event.progress);
        // Also call general update callback
        cbs.onUpdate?.();
      } else if (event.type === "agent.completed" && event.taskId) {
        cbs.onAgentCompleted?.(event.taskId, {
          processingTimeMs: event.processingTimeMs ?? 0,
          successfulAgents: event.successfulAgents ?? 0,
          errors: event.errors,
        });
        // Refresh board data to show updated task with hints
        cbs.onUpdate?.();
      } else {
        // Handle other board update events (task.created, task.updated, etc.)
        cbs.onUpdate?.();
      }
    });

    joinBoards();

    return () => {
      socket.disconnect();
    };
  }, [boardIds]);
}
