import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnInitialPopulation } from '../engine/AgentFactory.ts';
import { runControlledExperiment } from '../engine/ExperimentRunner.ts';
import { SeededRandom } from '../engine/prng.ts';
import { executeSingleTick } from '../engine/SimulationEngine.ts';
import { buildEchoCityWorld } from '../engine/WorldBuilder.ts';
import type { MemoryRecord, WorldEventRecord } from '../../src/types/simulation.ts';

function createTestContext(seed: number) {
  const built = buildEchoCityWorld({ seed });
  const world = {
    id: `test-${seed}`,
    ...built,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const rng = new SeededRandom(seed);
  rng.setState(world.prngState);
  const { agents, relationships } = spawnInitialPopulation({ world, rng });
  world.prngState = rng.getState();

  return {
    world,
    agents,
    relationships,
    activeEvents: [] as WorldEventRecord[],
    memoriesByAgent: new Map<string, MemoryRecord[]>(),
  };
}

test('AgentFactory spawns exactly 30 agents with exact role distribution and 10 per community', () => {
  const ctx = createTestContext(2026);
  assert.equal(ctx.agents.length, 30);

  const communityCounts = { greenfield: 0, metrocore: 0, novadistrict: 0 };
  const roleCounts: Record<string, number> = {};

  for (const agent of ctx.agents) {
    communityCounts[agent.state.currentCommunity] += 1;
    roleCounts[agent.initialRole] = (roleCounts[agent.initialRole] ?? 0) + 1;
  }

  assert.deepEqual(communityCounts, { greenfield: 10, metrocore: 10, novadistrict: 10 });
  assert.equal(roleCounts.entrepreneur, 4);
  assert.equal(roleCounts.farmer, 4);
  assert.equal(roleCounts.engineer, 3);
  assert.equal(roleCounts.researcher, 3);
  assert.equal(roleCounts.trader, 4);
  assert.equal(roleCounts.healthcare, 3);
  assert.equal(roleCounts.teacher, 3);
  assert.equal(roleCounts.citizen, 6);
});

test('12-step discrete tick simulation is strictly deterministic for identical seeds and prevents negative balances', () => {
  const ctxA = createTestContext(777);
  const ctxB = createTestContext(777);

  for (let i = 0; i < 20; i++) {
    const outA = executeSingleTick(ctxA);
    const outB = executeSingleTick(ctxB);
    assert.equal(outA.snapshot.avgWellbeing, outB.snapshot.avgWellbeing);
    assert.equal(outA.snapshot.wealthGini, outB.snapshot.wealthGini);
    assert.equal(outA.snapshot.totalResources.money, outB.snapshot.totalResources.money);
  }

  for (const agent of ctxA.agents) {
    for (const [resName, val] of Object.entries(agent.state.inventory)) {
      assert.ok(val >= 0, `Negative inventory detected for ${agent.name} (${resName}): ${val}`);
    }
  }
});

test('Research Laboratory executes multi-seed controlled experiments and reports real time-series metrics', () => {
  const exp = runControlledExperiment({
    researchQuestion: 'memory_vs_nomemory',
    ticksToRun: 15,
    seeds: [101, 202],
  });

  assert.equal(exp.status, 'completed');
  assert.equal(exp.results.length, 4); // 2 variants x 2 seeds
  for (const res of exp.results) {
    assert.equal(res.timeSeries.length, 15);
    assert.ok(res.finalAvgWellbeing >= 0 && res.finalAvgWellbeing <= 100);
    assert.ok(res.finalWealthGini >= 0 && res.finalWealthGini <= 1);
  }
});
