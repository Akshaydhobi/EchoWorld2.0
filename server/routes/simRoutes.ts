import { Router } from 'express';
import { DEFAULT_WORLD_SEED } from '../config/constants.ts';
import { RESEARCH_PRESETS, runControlledExperiment } from '../engine/ExperimentRunner.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { simulationManager } from '../services/SimulationManager.ts';
import { listExperimentRecords, saveExperimentRecord } from '../services/simulationStore.ts';
import type { ResearchQuestionId, WorldEventType } from '../../src/types/simulation.ts';
import type { CommunityId } from '../../src/types/world.ts';

export const simRouter = Router();

const VALID_EVENT_TYPES: WorldEventType[] = [
  'weather_disruption',
  'energy_shortage',
  'resource_scarcity',
  'market_shift',
  'tech_discovery',
  'business_opportunity',
  'infrastructure_fault',
];

const VALID_COMMUNITIES: Array<CommunityId | 'all'> = [
  'all',
  'greenfield',
  'metrocore',
  'novadistrict',
];

simRouter.get('/sim/bundle', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.ensureInitialized();
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

simRouter.post('/sim/start', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.start();
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

simRouter.post('/sim/pause', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.pause();
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

simRouter.post('/sim/step', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.stepOnce();
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

simRouter.post('/sim/reset', async (req, res, next) => {
  try {
    const seed = Number(req.body?.seed ?? DEFAULT_WORLD_SEED);
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483647) {
      throw new AppError('Seed must be an integer between 1 and 2147483647.', 400);
    }
    const bundle = await simulationManager.resetWorld({ seed });
    res.status(201).json(bundle);
  } catch (error) {
    next(error);
  }
});

simRouter.patch('/sim/speed', async (req, res, next) => {
  try {
    const tickIntervalMs = Number(req.body?.tickIntervalMs);
    if (!Number.isFinite(tickIntervalMs) || tickIntervalMs < 150 || tickIntervalMs > 5000) {
      throw new AppError('tickIntervalMs must be between 150 and 5000 ms.', 400);
    }
    const bundle = await simulationManager.setSpeed(tickIntervalMs);
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

// Agents & private memory inspection
simRouter.get('/agents', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.ensureInitialized();
    res.json({ agents: bundle.agents });
  } catch (error) {
    next(error);
  }
});

simRouter.get('/agents/:id', async (req, res, next) => {
  try {
    await simulationManager.ensureInitialized();
    const details = simulationManager.getAgentDetails(req.params.id);
    if (!details) {
      throw new AppError('Agent not found.', 404);
    }
    res.json(details);
  } catch (error) {
    next(error);
  }
});

// Events & manual Architect event trigger
simRouter.get('/events', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.ensureInitialized();
    res.json({
      activeEvents: bundle.activeEvents,
      recentEvents: bundle.recentEvents,
    });
  } catch (error) {
    next(error);
  }
});

simRouter.post('/events/trigger', async (req, res, next) => {
  try {
    const type = req.body?.type as WorldEventType;
    const targetCommunity = (req.body?.targetCommunity ?? 'all') as CommunityId | 'all';

    if (!VALID_EVENT_TYPES.includes(type)) {
      throw new AppError('Invalid world event type requested.', 400);
    }
    if (!VALID_COMMUNITIES.includes(targetCommunity)) {
      throw new AppError('Invalid targetCommunity requested.', 400);
    }

    const bundle = await simulationManager.triggerEvent({
      type,
      targetCommunity,
      customTitle: typeof req.body?.customTitle === 'string' ? req.body.customTitle.slice(0, 80) : undefined,
      customDescription: typeof req.body?.customDescription === 'string' ? req.body.customDescription.slice(0, 240) : undefined,
    });
    res.status(201).json(bundle);
  } catch (error) {
    next(error);
  }
});

// Research metrics & controlled experiments
simRouter.get('/research/metrics', async (_req, res, next) => {
  try {
    const bundle = await simulationManager.ensureInitialized();
    res.json({
      snapshots: bundle.snapshots,
      latestSnapshot: bundle.latestSnapshot,
    });
  } catch (error) {
    next(error);
  }
});

simRouter.get('/research/experiments', async (_req, res, next) => {
  try {
    const experiments = await listExperimentRecords();
    res.json({ experiments });
  } catch (error) {
    next(error);
  }
});

simRouter.post('/research/experiments', async (req, res, next) => {
  try {
    const researchQuestion = req.body?.researchQuestion as ResearchQuestionId;
    if (!(researchQuestion in RESEARCH_PRESETS)) {
      throw new AppError('Invalid researchQuestion identifier.', 400);
    }

    const ticksToRun = Number(req.body?.ticksToRun ?? 50);
    if (!Number.isInteger(ticksToRun) || ticksToRun < 10 || ticksToRun > 300) {
      throw new AppError('ticksToRun must be an integer between 10 and 300.', 400);
    }

    const rawSeeds: unknown[] = Array.isArray(req.body?.seeds)
      ? req.body.seeds
      : [101, 202, 303];
    const seeds = rawSeeds
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 2147483647)
      .slice(0, 5);

    if (seeds.length === 0) {
      throw new AppError('Provide at least one valid positive integer seed.', 400);
    }

    const experiment = runControlledExperiment({
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      researchQuestion,
      ticksToRun,
      seeds,
    });

    await saveExperimentRecord(experiment);
    res.status(201).json({ experiment });
  } catch (error) {
    next(error);
  }
});
