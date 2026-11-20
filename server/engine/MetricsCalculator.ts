import crypto from 'crypto';
import type {
  AgentComposite,
  AgentInventory,
  CommunityMetricSummary,
  SnapshotRecord,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { WorldState } from '../../src/types/world.ts';

/**
 * Computes the Gini coefficient for wealth inequality across all agents (0 = perfect equality, 1 = maximal inequality).
 */
export function computeWealthGini(wealthValues: number[]): number {
  const n = wealthValues.length;
  if (n === 0) return 0;
  const sorted = [...wealthValues].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return 0;

  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  const gini = weightedSum / (n * sum);
  return Number(Math.max(0, Math.min(1, gini)).toFixed(3));
}

export function calculateTickSnapshot(params: {
  world: WorldState;
  agents: AgentComposite[];
  activeEvents: WorldEventRecord[];
  cooperativeActionsThisTick: number;
  successfulActionsThisTick: number;
}): SnapshotRecord {
  const {
    world,
    agents,
    activeEvents,
    cooperativeActionsThisTick,
    successfulActionsThisTick,
  } = params;

  const count = Math.max(1, agents.length);
  const totalResources: AgentInventory = {
    money: 0,
    food: 0,
    energy: 0,
    materials: 0,
    knowledge: 0,
    healthcare: 0,
  };

  let wellbeingSum = 0;
  const wealthList: number[] = [];

  for (const agent of agents) {
    wellbeingSum += agent.state.wellbeing;
    wealthList.push(agent.state.inventory.money);
    totalResources.money += agent.state.inventory.money;
    totalResources.food += agent.state.inventory.food;
    totalResources.energy += agent.state.inventory.energy;
    totalResources.materials += agent.state.inventory.materials;
    totalResources.knowledge += agent.state.inventory.knowledge;
    totalResources.healthcare += agent.state.inventory.healthcare;
  }

  for (const key of Object.keys(totalResources) as Array<keyof AgentInventory>) {
    totalResources[key] = Number(totalResources[key].toFixed(2));
  }

  const communityStats: CommunityMetricSummary[] = world.communities.map((comm) => {
    const members = agents.filter((a) => a.state.currentCommunity === comm.id);
    const avgWellbeing =
      members.length > 0
        ? Number(
            (
              members.reduce((sum, m) => sum + m.state.wellbeing, 0) / members.length
            ).toFixed(1),
          )
        : 0;
    const totalWealthEC = Number(
      members.reduce((sum, m) => sum + m.state.inventory.money, 0).toFixed(2),
    );
    return {
      communityId: comm.id,
      name: comm.name,
      population: members.length,
      avgWellbeing,
      totalWealthEC,
    };
  });

  return {
    id: crypto.randomUUID(),
    worldId: world.id,
    tick: world.currentTick,
    populationActive: agents.length,
    avgWellbeing: Number((wellbeingSum / count).toFixed(2)),
    cooperationRate: Number((cooperativeActionsThisTick / count).toFixed(3)),
    wealthGini: computeWealthGini(wealthList),
    decisionSuccessRate: Number((successfulActionsThisTick / count).toFixed(3)),
    totalResources,
    marketPrices: { ...world.marketPrices },
    communityStats,
    activeEventCount: activeEvents.length,
  };
}
