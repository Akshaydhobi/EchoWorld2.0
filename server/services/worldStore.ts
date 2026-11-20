import crypto from 'crypto';
import { DEFAULT_WORLD_SEED } from '../config/constants.ts';
import { getStorageMode } from '../config/db.ts';
import { buildEchoCityWorld } from '../engine/WorldBuilder.ts';
import { WorldModel } from '../models/World.ts';
import type { WorldRules, WorldState } from '../../src/types/world.ts';

let memoryWorld: WorldState | null = null;

function serializeWorldDoc(doc: Record<string, unknown>): WorldState {
  const plain = typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : doc;

  return {
    id: String(plain._id ?? plain.id ?? 'echo-city'),
    name: String(plain.name),
    seed: Number(plain.seed),
    prngState: Number(plain.prngState),
    currentTick: Number(plain.currentTick),
    status: plain.status as WorldState['status'],
    tickIntervalMs: Number(plain.tickIntervalMs),
    communities: plain.communities as WorldState['communities'],
    marketPrices: plain.marketPrices as WorldState['marketPrices'],
    rules: plain.rules as WorldState['rules'],
    createdAt: plain.createdAt ? new Date(String(plain.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: plain.updatedAt ? new Date(String(plain.updatedAt)).toISOString() : new Date().toISOString(),
  };
}

export async function getOrCreateActiveWorld(): Promise<WorldState> {
  if (getStorageMode() === 'mongodb') {
    const existing = await WorldModel.findOne().sort({ updatedAt: -1 });
    if (existing) {
      return serializeWorldDoc(existing);
    }
    return createOrResetWorld({ seed: DEFAULT_WORLD_SEED });
  }

  if (!memoryWorld) {
    return createOrResetWorld({ seed: DEFAULT_WORLD_SEED });
  }

  return structuredClone(memoryWorld);
}

export async function createOrResetWorld(params: {
  seed: number;
  rules?: Partial<WorldRules>;
  tickIntervalMs?: number;
}): Promise<WorldState> {
  const built = buildEchoCityWorld(params);

  if (getStorageMode() === 'mongodb') {
    await WorldModel.deleteMany({});
    const created = await WorldModel.create(built);
    return serializeWorldDoc(created);
  }

  const now = new Date().toISOString();
  memoryWorld = {
    id: crypto.randomUUID(),
    ...built,
    createdAt: now,
    updatedAt: now,
  };

  return structuredClone(memoryWorld);
}

export async function updateWorldRules(patch: Partial<WorldRules>): Promise<WorldState> {
  const current = await getOrCreateActiveWorld();
  const nextRules: WorldRules = {
    ...current.rules,
    ...patch,
  };

  if (getStorageMode() === 'mongodb') {
    const updated = await WorldModel.findByIdAndUpdate(
      current.id,
      { $set: { rules: nextRules } },
      { new: true, runValidators: true },
    );
    if (!updated) {
      throw new Error('Active world record not found during rule update.');
    }
    return serializeWorldDoc(updated);
  }

  memoryWorld = {
    ...current,
    rules: nextRules,
    updatedAt: new Date().toISOString(),
  };

  return structuredClone(memoryWorld);
}
