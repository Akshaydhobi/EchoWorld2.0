import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './server/config/db.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { simRouter } from './server/routes/simRoutes.ts';
import { worldRouter } from './server/routes/worldRoutes.ts';
import { simulationManager } from './server/services/SimulationManager.ts';
import { initSocketServer } from './server/sockets/simSocket.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const configuredPort = process.env.PORT?.trim();
  const PORT = configuredPort ? Number(configuredPort) : 3000;
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const isProduction = process.env.NODE_ENV === 'production';

  await connectDatabase();
  await simulationManager.ensureInitialized();

  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'EchoWorld server is running',
  });
});
  app.use('/api', worldRouter);
  app.use('/api', simRouter);

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(
          new Error(
            `[EchoWorld Server] Port ${PORT} is already in use. Stop the other process or set a different PORT in .env.`,
          ),
        );
        return;
      }
      reject(error);
    };

    httpServer.once('error', onError);
    httpServer.listen(PORT, '0.0.0.0', () => {
      httpServer.off('error', onError);
      console.log(`[EchoWorld Server] Listening on http://localhost:${PORT}`);
      resolve();
    });
  });
}

startServer().catch((err) => {
  console.error('[EchoWorld Server] Fatal startup error:', err);
  process.exit(1);
});
