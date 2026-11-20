import crypto from 'crypto';
import { DEFAULT_WORLD_SEED } from '../config/constants.ts';
import { spawnInitialPopulation } from '../engine/AgentFactory.ts';
import { createWorldEvent } from '../engine/EventEngine.ts';
import { calculateTickSnapshot } from '../engine/MetricsCalculator.ts';
import { SeededRandom } from '../engine/prng.ts';
import { executeSingleTick } from '../engine/SimulationEngine.ts';
import { buildEchoCityWorld } from '../engine/WorldBuilder.ts';
import type {
  AgentComposite,
  FullSimulationBundle,
  MemoryRecord,
  WorldEventType,
} from '../../src/types/simulation.ts';
import type { CommunityId, WorldRules, WorldState } from '../../src/types/world.ts';
import {
  persistFullReset,
  persistTickDelta,
  trimRollingBuffers,
  type PersistedSimulationData,
} from './simulationStore.ts';

type BundleListener = (bundle: FullSimulationBundle) => void;

class SimulationManager {
  private state: PersistedSimulationData | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<BundleListener>();
  private isTickRunning = false;

  public onBundleUpdate(listener: BundleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitUpdate(): void {
    if (!this.state) return;
    const bundle = this.getBundleSync();
    for (const listener of this.listeners) {
      listener(bundle);
    }
  }

  public async ensureInitialized(seed = DEFAULT_WORLD_SEED): Promise<FullSimulationBundle> {
    if (!this.state) {
      return this.resetWorld({ seed });
    }
    return this.getBundleSync();
  }

  public getBundleSync(): FullSimulationBundle {
    if (!this.state) {
      throw new Error('Simulation state has not been initialized yet.');
    }
    return {
      world: structuredClone(this.state.world),
      agents: structuredClone(this.state.agents),
      relationships: structuredClone(this.state.relationships),
      activeEvents: structuredClone(this.state.activeEvents),
      recentEvents: structuredClone(this.state.allEvents.slice(0, 60)),
      recentTransactions: structuredClone(this.state.transactions.slice(0, 80)),
      snapshots: structuredClone(this.state.snapshots),
      latestSnapshot:
        this.state.snapshots.length > 0
          ? structuredClone(this.state.snapshots[this.state.snapshots.length - 1])
          : null,
    };
  }

  public async resetWorld(options: {
    seed: number;
    rules?: Partial<WorldRules>;
    tickIntervalMs?: number;
  }): Promise<FullSimulationBundle> {
    this.stopTimer();
    const built = buildEchoCityWorld(options);
    const now = new Date().toISOString();
    const world: WorldState = {
      id: crypto.randomUUID(),
      ...built,
      createdAt: now,
      updatedAt: now,
    };

    const rng = new SeededRandom(world.seed);
    rng.setState(world.prngState);
    const { agents, relationships } = spawnInitialPopulation({ world, rng });
    world.prngState = rng.getState();

    const initialSnapshot = calculateTickSnapshot({
      world,
      agents,
      activeEvents: [],
      cooperativeActionsThisTick: 0,
      successfulActionsThisTick: agents.length,
    });

    const genesisEvent = createWorldEvent({
      worldId: world.id,
      tick: 0,
      source: 'architect_intervention',
      type: 'rule_change',
      targetCommunity: 'all',
      customTitle: `Echo City Initialized (Seed #${world.seed})`,
      customDescription: '30 autonomous agents spawned across Greenfield, MetroCore, and NovaDistrict.',
      durationTicks: 1,
    });

    this.state = {
      world,
      agents,
      relationships,
      activeEvents: [],
      allEvents: [genesisEvent],
      transactions: [],
      snapshots: [initialSnapshot],
      memoriesByAgent: new Map<string, MemoryRecord[]>(),
    };

    await persistFullReset(this.state);
    this.emitUpdate();
    return this.getBundleSync();
  }

  public async stepOnce(): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state || this.isTickRunning) {
      return this.getBundleSync();
    }

    this.isTickRunning = true;
    try {
      const output = executeSingleTick({
        world: this.state.world,
        agents: this.state.agents,
        relationships: this.state.relationships,
        activeEvents: this.state.activeEvents,
        memoriesByAgent: this.state.memoriesByAgent,
      });

      this.state.world.updatedAt = new Date().toISOString();
      this.state.snapshots.push(output.snapshot);

      if (output.newTransactions.length > 0) {
        this.state.transactions.unshift(...output.newTransactions);
      }
      if (output.newEvents.length > 0) {
        this.state.allEvents.unshift(...output.newEvents);
      }

      trimRollingBuffers(this.state);

      await persistTickDelta({
        world: this.state.world,
        agents: this.state.agents,
        snapshot: output.snapshot,
        newTransactions: output.newTransactions,
        newEvents: output.newEvents,
      });

      this.emitUpdate();
      return this.getBundleSync();
    } finally {
      this.isTickRunning = false;
    }
  }

  public async start(): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state) throw new Error('World unavailable.');
    this.state.world.status = 'running';
    this.startTimer();
    this.emitUpdate();
    return this.getBundleSync();
  }

  public async pause(): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state) throw new Error('World unavailable.');
    this.stopTimer();
    this.state.world.status = 'paused';
    this.emitUpdate();
    return this.getBundleSync();
  }

  public async setSpeed(tickIntervalMs: number): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state) throw new Error('World unavailable.');
    this.state.world.tickIntervalMs = tickIntervalMs;
    if (this.state.world.status === 'running') {
      this.startTimer();
    }
    this.emitUpdate();
    return this.getBundleSync();
  }

  public async updateRules(patch: Partial<WorldRules>): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state) throw new Error('World unavailable.');
    this.state.world.rules = {
      ...this.state.world.rules,
      ...patch,
    };
    this.state.world.updatedAt = new Date().toISOString();

    const changedKeys = Object.keys(patch).join(', ');
    const auditEvent = createWorldEvent({
      worldId: this.state.world.id,
      tick: this.state.world.currentTick,
      source: 'architect_intervention',
      type: 'rule_change',
      targetCommunity: 'all',
      customTitle: 'Architect Updated World Rules',
      customDescription: `Modified rules: ${changedKeys}`,
      durationTicks: 1,
    });
    this.state.allEvents.unshift(auditEvent);

    this.emitUpdate();
    return this.getBundleSync();
  }

  public async triggerEvent(params: {
    type: WorldEventType;
    targetCommunity: CommunityId | 'all';
    customTitle?: string;
    customDescription?: string;
  }): Promise<FullSimulationBundle> {
    await this.ensureInitialized();
    if (!this.state) throw new Error('World unavailable.');

    const ev = createWorldEvent({
      worldId: this.state.world.id,
      tick: this.state.world.currentTick,
      source: 'architect_intervention',
      type: params.type,
      targetCommunity: params.targetCommunity,
      customTitle: params.customTitle,
      customDescription: params.customDescription,
    });

    this.state.activeEvents.push(ev);
    this.state.allEvents.unshift(ev);
    trimRollingBuffers(this.state);
    this.emitUpdate();
    return this.getBundleSync();
  }

  public getAgentDetails(agentId: string): {
    agent: AgentComposite;
    memories: MemoryRecord[];
  } | null {
    if (!this.state) return null;
    const agent = this.state.agents.find((a) => a.id === agentId || a.agentCode === agentId);
    if (!agent) return null;
    const memories = this.state.memoriesByAgent.get(agent.id) ?? [];
    return {
      agent: structuredClone(agent),
      memories: structuredClone(memories),
    };
  }

  private startTimer(): void {
    this.stopTimer();
    if (!this.state) return;
    const interval = Math.max(150, this.state.world.tickIntervalMs);
    this.timer = setInterval(() => {
      void this.stepOnce();
    }, interval);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const simulationManager = new SimulationManager();
