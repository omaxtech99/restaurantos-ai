import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { WaiterCallEvent } from '@restaurantos/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

/** Subscribes to live "call waiter" pings for the caller's tenant. */
export function useWaiterCalls(
  accessToken: string | null,
  onWaiterCall: (event: WaiterCallEvent) => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/realtime`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('waiter_calls', onWaiterCall);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
}
