import crypto from 'crypto';
import type {
  ExperimentRecord,
  ExperimentRunResult,
  ExperimentTimePoint,
  ExperimentVariantSpec,
  MemoryRecord,
  ResearchQuestionId,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import { spawnInitialPopulation } from './AgentFactory.ts';
import { createWorldEvent } from './EventEngine.ts';
import { SeededRandom } from './prng.ts';
import { executeSingleTick } from './SimulationEngine.ts';
import { buildEchoCityWorld } from './WorldBuilder.ts';

export const RESEARCH_PRESETS: Record<
  ResearchQuestionId,
  { title: string; variants: ExperimentVariantSpec[] }
> = {
  cooperation_vs_independence: {
    title: 'Cooperation vs. Independence',
    variants: [
      {
        label: 'High Cooperation',
        ruleOverrides: { randomEventsEnabled: true },
        personalityCooperationBias: 0.28,
      },
      {
        label: 'High Independence',
        ruleOverrides: { randomEventsEnabled: true },
        personalityCooperationBias: -0.28,
      },
    ],
  },
  memory_vs_nomemory: {
    title: 'Memory-Enabled vs. Memory-Disabled Agents',
    variants: [
      {
        label: 'Memory Enabled',
        ruleOverrides: { memoryEnabled: true, randomEventsEnabled: true },
      },
      {
        label: 'Memory Disabled',
        ruleOverrides: { memoryEnabled: false, randomEventsEnabled: true },
      },
    ],
  },
  resource_scarcity: {
    title: 'Abundance vs. Resource Scarcity',
    variants: [
      {
        label: 'Baseline Abundance',
        ruleOverrides: { randomEventsEnabled: false },
        initialScarcityFactor: 1.0,
      },
      {
        label: 'Severe Initial Scarcity',
        ruleOverrides: { randomEventsEnabled: false },
        initialScarcityFactor: 0.45,
      },
    ],
  },
  personality_diversity: {
    title: 'Homogeneous vs. Diverse Personalities',
    variants: [
      {
        label: 'Diverse Traits',
        ruleOverrides: { randomEventsEnabled: true },
        personalityDiversityScale: 1.35,
      },
      {
        label: 'Uniform Traits',
        ruleOverrides: { randomEventsEnabled: true },
        personalityDiversityScale: 0.1,
      },
    ],
  },
  centralized_vs_decentralized: {
    title: 'Centralized vs. Decentralized Coordination',
    variants: [
      {
        label: 'Decentralized Utility',
        ruleOverrides: { coordinationMode: 'decentralized', randomEventsEnabled: true },
      },
      {
        label: 'Centralized Civic Guidance',
        ruleOverrides: { coordinationMode: 'centralized', randomEventsEnabled: true },
      },
    ],
  },
  event_adaptability: {
    title: 'Adaptability Under Environmental Shock',
    variants: [
      {
        label: 'Adaptive Rules (Migration + Role Switch)',
        ruleOverrides: { allowMigration: true, allowRoleChange: true, randomEventsEnabled: false },
        injectShockAtTick: 15,
      },
      {
        label: 'Locked Rules (No Migration / Role Switch)',
        ruleOverrides: { allowMigration: false, allowRoleChange: false, randomEventsEnabled: false },
        injectShockAtTick: 15,
      },
    ],
  },
};

function runVariantTrial(params: {
  variant: ExperimentVariantSpec;
  seed: number;
  ticksToRun: number;
}): ExperimentRunResult {
  const { variant, seed, ticksToRun } = params;

  const builtWorld = buildEchoCityWorld({
    seed,
    rules: variant.ruleOverrides,
  });

  const world = {
    id: `exp-${seed}-${variant.label}`,
    ...builtWorld,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rng = new SeededRandom(seed);
  rng.setState(world.prngState);

  const { agents, relationships } = spawnInitialPopulation({
    world,
    rng,
    personalityCooperationBias: variant.personalityCooperationBias ?? 0,
    personalityDiversityScale: variant.personalityDiversityScale ?? 1,
    initialScarcityFactor: variant.initialScarcityFactor ?? 1,
  });

  world.prngState = rng.getState();

  const activeEvents: WorldEventRecord[] = [];
  const memoriesByAgent = new Map<string, MemoryRecord[]>();
  const timeSeries: ExperimentTimePoint[] = [];

  let coopSum = 0;
  let successSum = 0;
  let baselineWellbeingBeforeShock: number | null = null;
  let recoveryTicks: number | null = null;

  for (let t = 1; t <= ticksToRun; t++) {
    if (variant.injectShockAtTick && t === variant.injectShockAtTick) {
      baselineWellbeingBeforeShock =
        timeSeries[timeSeries.length - 1]?.avgWellbeing ?? 75;
      activeEvents.push(
        createWorldEvent({
          worldId: world.id,
          tick: t,
          source: 'architect_intervention',
          type: 'energy_shortage',
          targetCommunity: 'all',
          durationTicks: 8,
        }),
      );
    }

    const { snapshot } = executeSingleTick({
      world,
      agents,
      relationships,
      activeEvents,
      memoriesByAgent,
    });

    coopSum += snapshot.cooperationRate;
    successSum += snapshot.decisionSuccessRate;

    if (
      variant.injectShockAtTick &&
      t > variant.injectShockAtTick + 2 &&
      baselineWellbeingBeforeShock !== null &&
      recoveryTicks === null &&
      snapshot.avgWellbeing >= baselineWellbeingBeforeShock - 1.5
    ) {
      recoveryTicks = t - variant.injectShockAtTick;
    }

    timeSeries.push({
      tick: snapshot.tick,
      avgWellbeing: snapshot.avgWellbeing,
      cooperationRate: snapshot.cooperationRate,
      wealthGini: snapshot.wealthGini,
      decisionSuccessRate: snapshot.decisionSuccessRate,
      totalFood: snapshot.totalResources.food,
      totalEnergy: snapshot.totalResources.energy,
      totalMoney: snapshot.totalResources.money,
    });
  }

  const last = timeSeries[timeSeries.length - 1];
  const totals = {
    money: 0,
    food: 0,
    energy: 0,
    materials: 0,
    knowledge: 0,
    healthcare: 0,
  };
  for (const agent of agents) {
    totals.money += agent.state.inventory.money;
    totals.food += agent.state.inventory.food;
    totals.energy += agent.state.inventory.energy;
    totals.materials += agent.state.inventory.materials;
    totals.knowledge += agent.state.inventory.knowledge;
    totals.healthcare += agent.state.inventory.healthcare;
  }

  return {
    variantLabel: variant.label,
    seed,
    finalAvgWellbeing: last?.avgWellbeing ?? 0,
    meanCooperationRate: Number((coopSum / ticksToRun).toFixed(3)),
    finalWealthGini: last?.wealthGini ?? 0,
    decisionSuccessRate: Number((successSum / ticksToRun).toFixed(3)),
    recoveryTicks,
    resourceTotals: {
      money: Number(totals.money.toFixed(1)),
      food: Number(totals.food.toFixed(1)),
      energy: Number(totals.energy.toFixed(1)),
      materials: Number(totals.materials.toFixed(1)),
      knowledge: Number(totals.knowledge.toFixed(1)),
      healthcare: Number(totals.healthcare.toFixed(1)),
    },
    timeSeries,
  };
}

/**
 * Executes controlled empirical experiments across multiple random seeds and variants.
 * Reports actual measured outcomes without pre-assuming any hypothesis.
 */
export function runControlledExperiment(params: {
  name?: string;
  researchQuestion: ResearchQuestionId;
  ticksToRun: number;
  seeds: number[];
}): ExperimentRecord {
  const preset = RESEARCH_PRESETS[params.researchQuestion];
  const results: ExperimentRunResult[] = [];

  for (const variant of preset.variants) {
    for (const seed of params.seeds) {
      results.push(
        runVariantTrial({
          variant,
          seed,
          ticksToRun: params.ticksToRun,
        }),
      );
    }
  }

  return {
    id: crypto.randomUUID(),
    name: params.name?.trim() || preset.title,
    researchQuestion: params.researchQuestion,
    ticksToRun: params.ticksToRun,
    seeds: params.seeds,
    variants: preset.variants,
    results,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
}
