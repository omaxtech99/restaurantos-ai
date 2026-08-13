import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { OrderWithItems, WaiterCallEvent } from '@restaurantos/types';
import { TokenService } from '../../auth/application/token.service';
import { AppLogger } from '../../logger/app-logger.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/realtime',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokenService: TokenService,
    private readonly logger: AppLogger,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token =
        (typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined) ??
        (typeof client.handshake.headers.authorization === 'string'
          ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.tokenService.verifyAccessToken(token);
      client.data.user = payload;
      await client.join(`tenant:${payload.tenantId}`);
      this.logger.log(
        `Socket connected user=${payload.sub} tenant=${payload.tenantId}`,
        'EventsGateway',
      );
    } catch (error) {
      this.logger.warn(
        `Socket rejected: ${error instanceof Error ? error.message : 'unknown error'}`,
        'EventsGateway',
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const user = client.data.user as { sub?: string } | undefined;
    this.logger.log(`Socket disconnected user=${user?.sub ?? 'unknown'}`, 'EventsGateway');
  }

  emitOrderUpdate(tenantId: string, order: OrderWithItems): void {
    this.server.to(`tenant:${tenantId}`).emit('order_updates', order);
  }

  emitWaiterCall(tenantId: string, event: WaiterCallEvent): void {
    this.server.to(`tenant:${tenantId}`).emit('waiter_calls', event);
  }
}
