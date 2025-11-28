import { useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function useBoardRealtime(boardIds: string[], onUpdate: () => void) {
  const idsKey = useMemo(() => [...boardIds].sort().join(','), [boardIds]);

  useEffect(() => {
    if (!boardIds.length) {
      return;
    }

    const socket: Socket = io(`${WS_URL}/boards`, { transports: ['websocket'] });
    const joinBoards = () => {
      boardIds.forEach((boardId) => {
        socket.emit('join', { boardId });
      });
    };

    socket.on('connect', joinBoards);
    socket.on('board:update', () => {
      onUpdate();
    });

    joinBoards();

    return () => {
      socket.disconnect();
    };
  }, [idsKey, onUpdate, boardIds]);
}
