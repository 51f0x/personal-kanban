import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/boards', cors: true })
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const boardId = client.handshake.query.boardId;
    if (typeof boardId === 'string') {
      client.join(boardId);
      this.logger.verbose(`Client ${client.id} joined board ${boardId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.verbose(`Client disconnected ${client.id}`);
  }

  emitBoardUpdate(boardId: string, payload: unknown) {
    this.server.to(boardId).emit('board:update', payload);
  }
}
