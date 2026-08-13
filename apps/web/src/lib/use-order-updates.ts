import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { OrderWithItems } from '@restaurantos/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

/**
 * Subscribes to live order events for the caller's tenant so kitchen/waiter
 * screens update instantly instead of relying on a refetch interval. The
 * gateway scopes events to `tenant:${tenantId}` server-side (see
 * EventsGateway.handleConnection), so every event received here already
 * belongs to the connected staff member's tenant.
 */
export function useOrderUpdates(
  accessToken: string | null,
  onOrderUpdate: (order: OrderWithItems) => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/realtime`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('order_updates', onOrderUpdate);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
}
