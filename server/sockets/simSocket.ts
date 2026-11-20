import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { simulationManager } from '../services/SimulationManager.ts';
import type { FullSimulationBundle } from '../../src/types/simulation.ts';

let ioInstance: SocketIOServer | null = null;
let unsubListener: (() => void) | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  if (unsubListener) {
    unsubListener();
  }

  unsubListener = simulationManager.onBundleUpdate((bundle: FullSimulationBundle) => {
    ioInstance?.emit('sim:bundle', bundle);
    ioInstance?.emit('world:state', bundle.world);
  });

  ioInstance.on('connection', async (socket) => {
    try {
      const bundle = await simulationManager.ensureInitialized();
      socket.emit('sim:bundle', bundle);
      socket.emit('world:state', bundle.world);
    } catch (error) {
      console.error('[Socket.IO] Failed initial bundle sync:', error);
    }

    socket.on('world:sync-request', async () => {
      try {
        const bundle = await simulationManager.ensureInitialized();
        socket.emit('sim:bundle', bundle);
      } catch (error) {
        console.error('[Socket.IO] Failed manual sync:', error);
      }
    });
  });

  return ioInstance;
}
