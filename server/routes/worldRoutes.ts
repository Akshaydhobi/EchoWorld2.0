import { Router } from 'express';
import { DEFAULT_WORLD_SEED } from '../config/constants.ts';
import { getStorageMode } from '../config/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { simulationManager } from '../services/SimulationManager.ts';
import type { WorldRules } from '../../src/types/world.ts';

export const worldRouter = Router();

worldRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    storageMode: getStorageMode(),
    uptimeSeconds: Math.floor(process.uptime()),
    milestone: 'M1–M10 Complete',
  });
});

worldRouter.get('/world', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.ensureInitialized();
    res.json(bundle.world);
  } catch (error) {
    next(error);
  }
});

worldRouter.post('/world', async (req, res, next) => {
  try {
    const rawSeed = req.body?.seed ?? DEFAULT_WORLD_SEED;
    const seed = Number(rawSeed);
    if (!Number.isFinite(seed) || !Number.isInteger(seed) || seed < 1 || seed > 2147483647) {
      throw new AppError('Seed must be a positive integer between 1 and 2147483647.', 400);
    }

    const tickIntervalMs = req.body?.tickIntervalMs !== undefined
      ? Number(req.body.tickIntervalMs)
      : undefined;
    if (
      tickIntervalMs !== undefined &&
      (!Number.isFinite(tickIntervalMs) || tickIntervalMs < 150 || tickIntervalMs > 5000)
    ) {
      throw new AppError('tickIntervalMs must be between 150 and 5000.', 400);
    }

    const bundle = await simulationManager.resetWorld({
      seed,
      tickIntervalMs,
    });
    res.status(201).json(bundle.world);
  } catch (error) {
    next(error);
  }
});

worldRouter.patch('/world/rules', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const patch: Partial<WorldRules> = {};

    const booleanKeys: Array<keyof Pick<
      WorldRules,
      'allowMigration' | 'allowRoleChange' | 'memoryEnabled' | 'randomEventsEnabled'
    >> = ['allowMigration', 'allowRoleChange', 'memoryEnabled', 'randomEventsEnabled'];

    for (const key of booleanKeys) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') {
          throw new AppError(`Rule '${key}' must be a boolean.`, 400);
        }
        patch[key] = body[key];
      }
    }

    if (body.coordinationMode !== undefined) {
      if (body.coordinationMode !== 'decentralized' && body.coordinationMode !== 'centralized') {
        throw new AppError("coordinationMode must be 'decentralized' or 'centralized'.", 400);
      }
      patch.coordinationMode = body.coordinationMode;
    }

    if (body.taxRate !== undefined) {
      const taxRate = Number(body.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.5) {
        throw new AppError('taxRate must be between 0 and 0.5.', 400);
      }
      patch.taxRate = Number(taxRate.toFixed(2));
    }

    if (body.baseDecayRate !== undefined) {
      const decay = Number(body.baseDecayRate);
      if (!Number.isFinite(decay) || decay < 0.5 || decay > 10) {
        throw new AppError('baseDecayRate must be between 0.5 and 10.', 400);
      }
      patch.baseDecayRate = Number(decay.toFixed(2));
    }

    if (Object.keys(patch).length === 0) {
      throw new AppError('Provide at least one valid world rule field to update.', 400);
    }

    const bundle = await simulationManager.updateRules(patch);
    res.json(bundle.world);
  } catch (error) {
    next(error);
  }
});
