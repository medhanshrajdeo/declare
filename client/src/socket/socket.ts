import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const socket: Socket = io(URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export function emitAck<T = any>(event: string, payload?: any): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload ?? {}, (res: T) => resolve(res));
  });
}
