import crypto from 'crypto';
import type {
  AgentComposite,
  AgentRole,
  PersonalityTraits,
  RelationshipRecord,
} from '../../src/types/simulation.ts';
import type { CommunityId, WorldState } from '../../src/types/world.ts';
import { SeededRandom } from './prng.ts';

const AGENT_NAMES = [
  'Aarav Sen', 'Maya Lin', 'Elena Vance', 'Devon Brooks', 'Nadia Okafor',
  'Kieran Patel', 'Sora Takahashi', 'Lucas Meyer', 'Priya Nair', 'Julian Ortiz',
  'Hana Kim', 'Mateo Silva', 'Clara Novak', 'Tariq Al-Mansoor', 'Zoe Chen',
  'Rohan Verma', 'Freya Lindqvist', 'Isaac Mensah', 'Lina Rossi', 'Owen Mercer',
  'Ananya Rao', 'Gabriel Costa', 'Mei-Ling Zhou', 'Noah Sterling', 'Yuna Park',
  'Victor Moreau', 'Amara Diallo', 'Ethan Cole', 'Sofia Herrera', 'Liam Gallagher',
];

const COMMUNITY_ROLE_SLOTS: Array<{ communityId: CommunityId; role: AgentRole }> = [
  // Greenfield (10)
  { communityId: 'greenfield', role: 'farmer' },
  { communityId: 'greenfield', role: 'farmer' },
  { communityId: 'greenfield', role: 'farmer' },
  { communityId: 'greenfield', role: 'farmer' },
  { communityId: 'greenfield', role: 'trader' },
  { communityId: 'greenfield', role: 'teacher' },
  { communityId: 'greenfield', role: 'healthcare' },
  { communityId: 'greenfield', role: 'citizen' },
  { communityId: 'greenfield', role: 'citizen' },
  { communityId: 'greenfield', role: 'citizen' },
  // MetroCore (10)
  { communityId: 'metrocore', role: 'entrepreneur' },
  { communityId: 'metrocore', role: 'entrepreneur' },
  { communityId: 'metrocore', role: 'entrepreneur' },
  { communityId: 'metrocore', role: 'trader' },
  { communityId: 'metrocore', role: 'trader' },
  { communityId: 'metrocore', role: 'trader' },
  { communityId: 'metrocore', role: 'healthcare' },
  { communityId: 'metrocore', role: 'healthcare' },
  { communityId: 'metrocore', role: 'citizen' },
  { communityId: 'metrocore', role: 'citizen' },
  // NovaDistrict (10)
  { communityId: 'novadistrict', role: 'engineer' },
  { communityId: 'novadistrict', role: 'engineer' },
  { communityId: 'novadistrict', role: 'engineer' },
  { communityId: 'novadistrict', role: 'researcher' },
  { communityId: 'novadistrict', role: 'researcher' },
  { communityId: 'novadistrict', role: 'researcher' },
  { communityId: 'novadistrict', role: 'entrepreneur' },
  { communityId: 'novadistrict', role: 'teacher' },
  { communityId: 'novadistrict', role: 'teacher' },
  { communityId: 'novadistrict', role: 'citizen' },
];

const ROLE_GOALS: Record<AgentRole, { shortTerm: string; longTerm: string }> = {
  entrepreneur: {
    shortTerm: 'Identify profitable local shortages and coordinate ventures',
    longTerm: 'Establish resilient ventures and build capital reserves',
  },
  farmer: {
    shortTerm: 'Maintain steady food harvests at Greenfield farms',
    longTerm: 'Achieve food security surplus for Echo City',
  },
  engineer: {
    shortTerm: 'Keep energy grids and district infrastructure operational',
    longTerm: 'Upgrade city infrastructure resilience and energy efficiency',
  },
  researcher: {
    shortTerm: 'Generate scientific knowledge in NovaDistrict laboratories',
    longTerm: 'Unlock productivity breakthroughs across the civilization',
  },
  trader: {
    shortTerm: 'Balance inventory across district markets for margin',
    longTerm: 'Become a trusted inter-district commerce bridge',
  },
  healthcare: {
    shortTerm: 'Deliver medical services and maintain high citizen health',
    longTerm: 'Prevent district-wide wellbeing crises during shocks',
  },
  teacher: {
    shortTerm: 'Share applied knowledge and strengthen civic literacy',
    longTerm: 'Elevate citywide adaptability and cooperative skill',
  },
  citizen: {
    shortTerm: 'Secure daily food, rest, and steady Echo Credits',
    longTerm: 'Build durable social trust and adapt to emerging opportunities',
  },
};

export interface SpawnAgentsOptions {
  world: WorldState;
  rng: SeededRandom;
  personalityCooperationBias?: number;
  personalityDiversityScale?: number;
  initialScarcityFactor?: number;
}

function clamp01(val: number): number {
  return Number(Math.max(0.05, Math.min(0.98, val)).toFixed(2));
}

function generatePersonality(
  rng: SeededRandom,
  role: AgentRole,
  cooperationBias = 0,
  diversityScale = 1,
): PersonalityTraits {
  const spread = (base: number) => {
    const jitter = (rng.next() - 0.5) * 0.5 * diversityScale;
    return clamp01(base + jitter);
  };

  const roleCoopBase =
    role === 'healthcare' || role === 'teacher'
      ? 0.72
      : role === 'entrepreneur'
        ? 0.5
        : 0.6;

  return {
    cooperation: clamp01(roleCoopBase + (rng.next() - 0.5) * 0.45 * diversityScale + cooperationBias),
    riskTolerance: spread(role === 'entrepreneur' || role === 'trader' ? 0.68 : 0.42),
    curiosity: spread(role === 'researcher' || role === 'engineer' ? 0.78 : 0.52),
    adaptability: spread(0.58),
    resourceSaving: spread(role === 'farmer' ? 0.68 : 0.52),
  };
}

export function spawnInitialPopulation(options: SpawnAgentsOptions): {
  agents: AgentComposite[];
  relationships: RelationshipRecord[];
} {
  const {
    world,
    rng,
    personalityCooperationBias = 0,
    personalityDiversityScale = 1,
    initialScarcityFactor = 1,
  } = options;

  const agents: AgentComposite[] = COMMUNITY_ROLE_SLOTS.map((slot, index) => {
    const community = world.communities.find((c) => c.id === slot.communityId)!;
    const defaultBuilding =
      community.buildings.find((b) => b.type === 'residential') ?? community.buildings[0];

    const personality = generatePersonality(
      rng,
      slot.role,
      personalityCooperationBias,
      personalityDiversityScale,
    );

    const id = `agent-${String(index + 1).padStart(2, '0')}`;
    const agentCode = `AG-${String(index + 1).padStart(2, '0')}`;

    const baseMoney = slot.role === 'entrepreneur' || slot.role === 'trader' ? 240 : 160;
    const scale = Math.max(0.25, initialScarcityFactor);

    const inventory = {
      money: Math.round((baseMoney + rng.nextInt(-20, 40)) * scale),
      food: Math.max(1, Math.round((slot.role === 'farmer' ? 10 : 5) * scale)),
      energy: Math.max(1, Math.round((slot.role === 'engineer' ? 9 : 4) * scale)),
      materials: Math.max(1, Math.round((slot.role === 'engineer' ? 7 : 3) * scale)),
      knowledge: Math.max(0, Math.round((slot.role === 'researcher' || slot.role === 'teacher' ? 6 : 2) * scale)),
      healthcare: Math.max(0, Math.round((slot.role === 'healthcare' ? 6 : 2) * scale)),
    };

    const needs = {
      hunger: rng.nextInt(72, 92),
      rest: rng.nextInt(74, 94),
      health: rng.nextInt(78, 96),
      social: rng.nextInt(60, 84),
      purpose: rng.nextInt(62, 86),
    };

    const wellbeing = Math.round(
      (needs.hunger + needs.rest + needs.health + needs.social + needs.purpose) / 5,
    );

    return {
      id,
      worldId: world.id,
      agentCode,
      name: AGENT_NAMES[index],
      initialRole: slot.role,
      currentRole: slot.role,
      homeCommunity: slot.communityId,
      personality,
      shortTermGoal: ROLE_GOALS[slot.role].shortTerm,
      longTermGoal: ROLE_GOALS[slot.role].longTerm,
      strategyWeights: {
        produce: 1.0,
        trade: 1.0,
        cooperate: Number((0.8 + personality.cooperation * 0.5).toFixed(2)),
        innovate: Number((0.8 + personality.curiosity * 0.4).toFixed(2)),
        rest: 1.0,
        migrate: Number((0.7 + personality.adaptability * 0.4).toFixed(2)),
      },
      state: {
        agentId: id,
        tick: 0,
        currentCommunity: slot.communityId,
        currentBuildingId: defaultBuilding.buildingId,
        position: {
          x: Number((defaultBuilding.position.x + rng.range(-2.5, 2.5)).toFixed(2)),
          z: Number((defaultBuilding.position.z + rng.range(-2.5, 2.5)).toFixed(2)),
        },
        needs,
        energy: rng.nextInt(76, 95),
        wellbeing,
        inventory,
        lastAction: null,
        decisionHistory: [],
      },
    };
  });

  // Seed baseline symmetric social ties within communities + light cross-district trader ties
  const relationships: RelationshipRecord[] = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const sameDistrict = a.state.currentCommunity === b.state.currentCommunity;
      const isBridge =
        (a.currentRole === 'trader' || b.currentRole === 'trader') && rng.next() < 0.28;

      if (sameDistrict || isBridge) {
        const initialTrust = sameDistrict
          ? Number(rng.range(0.08, 0.36).toFixed(2))
          : Number(rng.range(0.02, 0.2).toFixed(2));
        relationships.push({
          id: crypto.randomUUID(),
          worldId: world.id,
          agentA: a.id,
          agentB: b.id,
          trust: initialTrust,
          affinity: Number(rng.range(0.28, 0.62).toFixed(2)),
          interactionCount: 0,
          successfulTrades: 0,
          conflicts: 0,
          lastInteractionTick: 0,
        });
      }
    }
  }

  return { agents, relationships };
}
