import type {
  AgentComposite,
  MemoryRecord,
  RelationshipRecord,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { Community, WorldState } from '../../src/types/world.ts';

export interface LocalAgentPeer {
  id: string;
  name: string;
  role: AgentComposite['currentRole'];
  trust: number;
  wellbeing: number;
  hasFoodSurplus: boolean;
  hasMaterialsSurplus: boolean;
  hasEnergySurplus: boolean;
}

export interface AgentPerception {
  community: Community;
  localPeers: LocalAgentPeer[];
  activeLocalEvents: WorldEventRecord[];
  marketPrices: WorldState['marketPrices'];
  ownMemories: MemoryRecord[];
  communityPopulation: number;
  otherCommunitiesSummary: Array<{
    id: Community['id'];
    name: string;
    population: number;
    infrastructureLevel: number;
  }>;
}

/**
 * Perception Engine: builds strictly bounded local observations.
 * Agents NEVER read another agent's private memories or personality traits;
 * they observe only shared district context and their own Relationship trust.
 */
export function buildAgentPerception(params: {
  agent: AgentComposite;
  allAgents: AgentComposite[];
  world: WorldState;
  relationships: RelationshipRecord[];
  activeEvents: WorldEventRecord[];
  agentMemories: MemoryRecord[];
}): AgentPerception {
  const { agent, allAgents, world, relationships, activeEvents, agentMemories } = params;
  const communityId = agent.state.currentCommunity;
  const community = world.communities.find((c) => c.id === communityId)!;

  const trustByPeerId = new Map<string, number>();
  for (const rel of relationships) {
    if (rel.agentA === agent.id) {
      trustByPeerId.set(rel.agentB, rel.trust);
    } else if (rel.agentB === agent.id) {
      trustByPeerId.set(rel.agentA, rel.trust);
    }
  }

  const localAgents = allAgents.filter(
    (other) => other.id !== agent.id && other.state.currentCommunity === communityId,
  );

  const localPeers: LocalAgentPeer[] = localAgents.map((other) => ({
    id: other.id,
    name: other.name,
    role: other.currentRole,
    trust: trustByPeerId.get(other.id) ?? 0,
    wellbeing: other.state.wellbeing,
    hasFoodSurplus: other.state.inventory.food >= 4,
    hasMaterialsSurplus: other.state.inventory.materials >= 3,
    hasEnergySurplus: other.state.inventory.energy >= 4,
  }));

  const activeLocalEvents = activeEvents.filter(
    (ev) => ev.targetCommunity === 'all' || ev.targetCommunity === communityId,
  );

  const popMap = new Map<Community['id'], number>([
    ['greenfield', 0],
    ['metrocore', 0],
    ['novadistrict', 0],
  ]);
  for (const a of allAgents) {
    popMap.set(a.state.currentCommunity, (popMap.get(a.state.currentCommunity) ?? 0) + 1);
  }

  const otherCommunitiesSummary = world.communities
    .filter((c) => c.id !== communityId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      population: popMap.get(c.id) ?? 0,
      infrastructureLevel: c.infrastructureLevel,
    }));

  return {
    community,
    localPeers,
    activeLocalEvents,
    marketPrices: world.marketPrices,
    ownMemories: world.rules.memoryEnabled ? agentMemories : [],
    communityPopulation: (popMap.get(communityId) ?? 0),
    otherCommunitiesSummary,
  };
}
