import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { WaitlistEntry } from '@restaurantos/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

/** Subscribes to live waitlist changes for the caller's tenant. */
export function useWaitlistUpdates(
  accessToken: string | null,
  onWaitlistUpdate: (entry: WaitlistEntry) => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/realtime`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('waitlist_updates', onWaitlistUpdate);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);
}
