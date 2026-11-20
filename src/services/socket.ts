import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSimSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}
