import crypto from 'crypto';
import type {
  AgentComposite,
  ResourceType,
  TransactionRecord,
  TransactionType,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { CommunityId, MarketPrices, WorldState } from '../../src/types/world.ts';

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Number(value.toFixed(2));
}

export function canSpend(
  agent: AgentComposite,
  resource: ResourceType,
  amount: number,
): boolean {
  if (amount <= 0) return false;
  return agent.state.inventory[resource] >= amount;
}

export function debitResource(
  agent: AgentComposite,
  resource: ResourceType,
  amount: number,
): boolean {
  if (!canSpend(agent, resource, amount)) {
    return false;
  }
  agent.state.inventory[resource] = clampNonNegative(
    agent.state.inventory[resource] - amount,
  );
  return true;
}

export function creditResource(
  agent: AgentComposite,
  resource: ResourceType,
  amount: number,
): void {
  if (amount <= 0) return;
  agent.state.inventory[resource] = clampNonNegative(
    agent.state.inventory[resource] + amount,
  );
}

export function createTransaction(params: {
  worldId: string;
  tick: number;
  txType: TransactionType;
  fromAgentId: string | null;
  toAgentId: string | null;
  resource: ResourceType;
  amount: number;
  unitPriceEC: number;
  communityId: CommunityId;
  note: string;
}): TransactionRecord {
  return {
    id: crypto.randomUUID(),
    ...params,
    amount: Number(Math.max(0.01, params.amount).toFixed(2)),
    unitPriceEC: Number(Math.max(0, params.unitPriceEC).toFixed(2)),
  };
}

export function getCommunityEventModifiers(
  activeEvents: WorldEventRecord[],
  communityId: CommunityId,
) {
  let foodMult = 1;
  let energyMult = 1;
  let materialsMult = 1;
  let knowledgeMult = 1;
  let priceMult = 1;

  for (const ev of activeEvents) {
    if (ev.targetCommunity === 'all' || ev.targetCommunity === communityId) {
      if (ev.modifiers.foodOutputMult) foodMult *= ev.modifiers.foodOutputMult;
      if (ev.modifiers.energyOutputMult) energyMult *= ev.modifiers.energyOutputMult;
      if (ev.modifiers.materialsOutputMult) materialsMult *= ev.modifiers.materialsOutputMult;
      if (ev.modifiers.knowledgeOutputMult) knowledgeMult *= ev.modifiers.knowledgeOutputMult;
      if (ev.modifiers.priceMult) priceMult *= ev.modifiers.priceMult;
    }
  }

  return {
    foodMult,
    energyMult,
    materialsMult,
    knowledgeMult,
    priceMult,
  };
}

/**
 * Updates supply-and-demand market prices based on per-capita resource abundance
 * and active economic shocks.
 */
export function updateMarketPrices(
  world: WorldState,
  agents: AgentComposite[],
  activeEvents: WorldEventRecord[],
): MarketPrices {
  const count = Math.max(1, agents.length);
  const totals = {
    food: 0,
    energy: 0,
    materials: 0,
    knowledge: 0,
    healthcare: 0,
  };

  for (const agent of agents) {
    totals.food += agent.state.inventory.food;
    totals.energy += agent.state.inventory.energy;
    totals.materials += agent.state.inventory.materials;
    totals.knowledge += agent.state.inventory.knowledge;
    totals.healthcare += agent.state.inventory.healthcare;
  }

  const eventPriceMult = activeEvents.reduce(
    (acc, ev) => (ev.modifiers.priceMult ? acc * ev.modifiers.priceMult : acc),
    1,
  );

  const adjust = (base: number, avgStock: number, targetPerAgent: number): number => {
    const ratio = targetPerAgent / Math.max(0.6, avgStock);
    const desired = base * Math.max(0.6, Math.min(2.4, ratio)) * eventPriceMult;
    return Number(Math.max(4, Math.min(85, desired)).toFixed(1));
  };

  return {
    food: adjust(12, totals.food / count, 4.5),
    energy: adjust(15, totals.energy / count, 4.0),
    materials: adjust(20, totals.materials / count, 3.5),
    knowledge: adjust(28, totals.knowledge / count, 3.0),
    healthcare: adjust(24, totals.healthcare / count, 2.5),
  };
}
