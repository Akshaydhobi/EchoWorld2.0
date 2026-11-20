import mongoose from 'mongoose';
import { getStorageMode } from '../config/db.ts';
import { AgentModel } from '../models/Agent.ts';
import { AgentStateModel } from '../models/AgentState.ts';
import { EventModel } from '../models/Event.ts';
import { ExperimentModel } from '../models/Experiment.ts';
import { MemoryModel } from '../models/Memory.ts';
import { RelationshipModel } from '../models/Relationship.ts';
import { SnapshotModel } from '../models/Snapshot.ts';
import { TransactionModel } from '../models/Transaction.ts';
import { WorldModel } from '../models/World.ts';
import type {
  AgentComposite,
  ExperimentRecord,
  MemoryRecord,
  RelationshipRecord,
  SnapshotRecord,
  TransactionRecord,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { WorldState } from '../../src/types/world.ts';

const MAX_TRANSACTIONS_CACHE = 250;
const MAX_SNAPSHOTS_CACHE = 300;
const MAX_EVENTS_CACHE = 200;

export interface PersistedSimulationData {
  world: WorldState;
  agents: AgentComposite[];
  relationships: RelationshipRecord[];
  activeEvents: WorldEventRecord[];
  allEvents: WorldEventRecord[];
  transactions: TransactionRecord[];
  snapshots: SnapshotRecord[];
  memoriesByAgent: Map<string, MemoryRecord[]>;
}

const memoryExperiments: ExperimentRecord[] = [];

function toObjectIdOrUndefined(id: string): mongoose.Types.ObjectId | undefined {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
}

export async function persistFullReset(data: PersistedSimulationData): Promise<WorldState> {
  if (getStorageMode() !== 'mongodb') {
    return data.world;
  }

  await Promise.all([
    WorldModel.deleteMany({}),
    AgentModel.deleteMany({}),
    AgentStateModel.deleteMany({}),
    MemoryModel.deleteMany({}),
    EventModel.deleteMany({}),
    TransactionModel.deleteMany({}),
    RelationshipModel.deleteMany({}),
    SnapshotModel.deleteMany({}),
  ]);

  const createdWorld = await WorldModel.create({
    name: data.world.name,
    seed: data.world.seed,
    prngState: data.world.prngState,
    currentTick: data.world.currentTick,
    status: data.world.status,
    tickIntervalMs: data.world.tickIntervalMs,
    communities: data.world.communities,
    marketPrices: data.world.marketPrices,
    rules: data.world.rules,
  });

  const worldObjectId = createdWorld._id;
  data.world.id = String(worldObjectId);

  const agentIdMap = new Map<string, mongoose.Types.ObjectId>();
  for (const agent of data.agents) {
    const doc = await AgentModel.create({
      worldId: worldObjectId,
      agentCode: agent.agentCode,
      name: agent.name,
      initialRole: agent.initialRole,
      currentRole: agent.currentRole,
      homeCommunity: agent.homeCommunity,
      personality: agent.personality,
      shortTermGoal: agent.shortTermGoal,
      longTermGoal: agent.longTermGoal,
      strategyWeights: agent.strategyWeights,
    });
    agentIdMap.set(agent.id, doc._id);
  }

  await AgentStateModel.insertMany(
    data.agents.map((agent) => ({
      worldId: worldObjectId,
      agentId: agentIdMap.get(agent.id)!,
      tick: agent.state.tick,
      currentCommunity: agent.state.currentCommunity,
      currentBuildingId: agent.state.currentBuildingId,
      position: agent.state.position,
      needs: agent.state.needs,
      energy: agent.state.energy,
      wellbeing: agent.state.wellbeing,
      inventory: agent.state.inventory,
      lastAction: agent.state.lastAction,
      decisionHistory: agent.state.decisionHistory,
    })),
  );

  if (data.relationships.length > 0) {
    await RelationshipModel.insertMany(
      data.relationships.map((rel) => ({
        worldId: worldObjectId,
        agentA: rel.agentA,
        agentB: rel.agentB,
        trust: rel.trust,
        affinity: rel.affinity,
        interactionCount: rel.interactionCount,
        successfulTrades: rel.successfulTrades,
        conflicts: rel.conflicts,
        lastInteractionTick: rel.lastInteractionTick,
      })),
    );
  }

  return data.world;
}

export async function persistTickDelta(params: {
  world: WorldState;
  agents: AgentComposite[];
  snapshot: SnapshotRecord;
  newTransactions: TransactionRecord[];
  newEvents: WorldEventRecord[];
}): Promise<void> {
  if (getStorageMode() !== 'mongodb') return;
  const worldObjectId = toObjectIdOrUndefined(params.world.id);
  if (!worldObjectId) return;

  await WorldModel.findByIdAndUpdate(worldObjectId, {
    $set: {
      prngState: params.world.prngState,
      currentTick: params.world.currentTick,
      status: params.world.status,
      tickIntervalMs: params.world.tickIntervalMs,
      communities: params.world.communities,
      marketPrices: params.world.marketPrices,
      rules: params.world.rules,
    },
  });

  await SnapshotModel.create({
    worldId: worldObjectId,
    tick: params.snapshot.tick,
    populationActive: params.snapshot.populationActive,
    avgWellbeing: params.snapshot.avgWellbeing,
    cooperationRate: params.snapshot.cooperationRate,
    wealthGini: params.snapshot.wealthGini,
    decisionSuccessRate: params.snapshot.decisionSuccessRate,
    totalResources: params.snapshot.totalResources,
    marketPrices: params.snapshot.marketPrices,
    communityStats: params.snapshot.communityStats,
    activeEventCount: params.snapshot.activeEventCount,
  });

  if (params.newTransactions.length > 0) {
    await TransactionModel.insertMany(
      params.newTransactions.map((tx) => ({
        worldId: worldObjectId,
        tick: tx.tick,
        txType: tx.txType,
        fromAgentId: tx.fromAgentId,
        toAgentId: tx.toAgentId,
        resource: tx.resource,
        amount: tx.amount,
        unitPriceEC: tx.unitPriceEC,
        communityId: tx.communityId,
        note: tx.note,
      })),
    );
  }

  if (params.newEvents.length > 0) {
    await EventModel.insertMany(
      params.newEvents.map((ev) => ({
        worldId: worldObjectId,
        tick: ev.tick,
        source: ev.source,
        type: ev.type,
        title: ev.title,
        description: ev.description,
        targetCommunity: ev.targetCommunity,
        modifiers: ev.modifiers,
        durationTicks: ev.durationTicks,
        remainingTicks: ev.remainingTicks,
      })),
    );
  }
}

export async function saveExperimentRecord(
  exp: ExperimentRecord,
): Promise<ExperimentRecord> {
  if (getStorageMode() === 'mongodb') {
    await ExperimentModel.create({
      name: exp.name,
      researchQuestion: exp.researchQuestion,
      ticksToRun: exp.ticksToRun,
      seeds: exp.seeds,
      variants: exp.variants,
      results: exp.results,
      status: exp.status,
    });
  } else {
    memoryExperiments.unshift(exp);
    if (memoryExperiments.length > 25) {
      memoryExperiments.pop();
    }
  }
  return exp;
}

export async function listExperimentRecords(): Promise<ExperimentRecord[]> {
  if (getStorageMode() === 'mongodb') {
    const docs = await ExperimentModel.find().sort({ createdAt: -1 }).limit(20).lean();
    return docs.map((d) => ({
      id: String(d._id),
      name: String(d.name),
      researchQuestion: d.researchQuestion as ExperimentRecord['researchQuestion'],
      ticksToRun: Number(d.ticksToRun),
      seeds: d.seeds as number[],
      variants: d.variants as ExperimentRecord['variants'],
      results: d.results as ExperimentRecord['results'],
      status: (d.status as ExperimentRecord['status']) ?? 'completed',
      createdAt: d.createdAt ? new Date(String(d.createdAt)).toISOString() : new Date().toISOString(),
    }));
  }
  return structuredClone(memoryExperiments);
}

export function trimRollingBuffers(data: PersistedSimulationData): void {
  if (data.transactions.length > MAX_TRANSACTIONS_CACHE) {
    data.transactions = data.transactions.slice(0, MAX_TRANSACTIONS_CACHE);
  }
  if (data.snapshots.length > MAX_SNAPSHOTS_CACHE) {
    data.snapshots = data.snapshots.slice(-MAX_SNAPSHOTS_CACHE);
  }
  if (data.allEvents.length > MAX_EVENTS_CACHE) {
    data.allEvents = data.allEvents.slice(0, MAX_EVENTS_CACHE);
  }
}
