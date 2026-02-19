import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from './useAppSelector';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';
const SOCKET_URL = BASE_URL.replace('/api/v1', '');

let globalSocket: Socket | null = null;

export const getSocket = () => globalSocket;

export const useSocket = () => {
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token: `Bearer ${accessToken}` },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      globalSocket.on('connect', () => console.log('[Socket] Connected:', globalSocket?.id));
      globalSocket.on('disconnect', () => console.log('[Socket] Disconnected'));
    }

    socketRef.current = globalSocket;

    return () => {
      // Don't disconnect on unmount - keep global connection alive
    };
  }, [user, accessToken]);

  return socketRef.current;
};
