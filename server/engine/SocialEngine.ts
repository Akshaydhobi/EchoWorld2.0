import crypto from 'crypto';
import type {
  AgentComposite,
  AgentRole,
  RelationshipRecord,
} from '../../src/types/simulation.ts';
import type { WorldState } from '../../src/types/world.ts';
import type { SeededRandom } from './prng.ts';

function orderedPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export function getOrCreateRelationship(
  relationships: RelationshipRecord[],
  worldId: string,
  id1: string,
  id2: string,
): RelationshipRecord {
  const [agentA, agentB] = orderedPair(id1, id2);
  const existing = relationships.find(
    (rel) => rel.agentA === agentA && rel.agentB === agentB,
  );
  if (existing) return existing;

  const created: RelationshipRecord = {
    id: crypto.randomUUID(),
    worldId,
    agentA,
    agentB,
    trust: 0.1,
    affinity: 0.4,
    interactionCount: 0,
    successfulTrades: 0,
    conflicts: 0,
    lastInteractionTick: 0,
  };
  relationships.push(created);
  return created;
}

export function recordSocialOutcome(params: {
  relationships: RelationshipRecord[];
  worldId: string;
  agentAId: string;
  agentBId: string;
  tick: number;
  kind: 'cooperation' | 'trade' | 'conflict' | 'social';
}): RelationshipRecord {
  const { relationships, worldId, agentAId, agentBId, tick, kind } = params;
  const rel = getOrCreateRelationship(relationships, worldId, agentAId, agentBId);
  rel.interactionCount += 1;
  rel.lastInteractionTick = tick;

  if (kind === 'cooperation') {
    rel.trust = Number(Math.min(1, rel.trust + 0.08).toFixed(2));
    rel.affinity = Number(Math.min(1, rel.affinity + 0.07).toFixed(2));
  } else if (kind === 'trade') {
    rel.successfulTrades += 1;
    rel.trust = Number(Math.min(1, rel.trust + 0.05).toFixed(2));
    rel.affinity = Number(Math.min(1, rel.affinity + 0.03).toFixed(2));
  } else if (kind === 'social') {
    rel.trust = Number(Math.min(1, rel.trust + 0.03).toFixed(2));
    rel.affinity = Number(Math.min(1, rel.affinity + 0.06).toFixed(2));
  } else {
    rel.conflicts += 1;
    rel.trust = Number(Math.max(-1, rel.trust - 0.14).toFixed(2));
    rel.affinity = Number(Math.max(0, rel.affinity - 0.09).toFixed(2));
  }

  return rel;
}

/**
 * Adaptive Role Switching: when permitted by world rules, agents experiencing
 * sustained low Echo Credits or reacting to acute food/energy shortages may
 * adapt their role toward high-demand vocations.
 */
export function maybeAdaptAgentRole(params: {
  agent: AgentComposite;
  world: WorldState;
  rng: SeededRandom;
}): AgentRole | null {
  const { agent, world, rng } = params;
  if (!world.rules.allowRoleChange) return null;
  if (agent.personality.adaptability < 0.55) return null;
  if (agent.state.inventory.money > 95) return null;
  if (rng.next() > 0.12) return null;

  let targetRole: AgentRole | null = null;
  if (world.marketPrices.food >= 18 && agent.currentRole !== 'farmer') {
    targetRole = 'farmer';
  } else if (world.marketPrices.energy >= 22 && agent.currentRole !== 'engineer') {
    targetRole = 'engineer';
  } else if (world.marketPrices.healthcare >= 30 && agent.currentRole !== 'healthcare') {
    targetRole = 'healthcare';
  }

  if (targetRole) {
    agent.currentRole = targetRole;
  }
  return targetRole;
}
