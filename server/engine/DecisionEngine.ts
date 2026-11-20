import type {
  ActionType,
  AgentComposite,
  ResourceType,
} from '../../src/types/simulation.ts';
import type { CommunityId, WorldState } from '../../src/types/world.ts';
import type { AgentPerception } from './PerceptionEngine.ts';
import type { SeededRandom } from './prng.ts';

export interface ProposedAction {
  agentId: string;
  actionType: ActionType;
  target: string;
  targetAgentId?: string;
  targetCommunityId?: CommunityId;
  resource?: ResourceType;
  utilityScore: number;
  reason: string;
}

/**
 * Autonomous Decision Engine: generates permitted candidate actions for an agent
 * and scores each via utility math combining needs, personality, private memory,
 * learned strategyWeights, and coordination mode.
 */
export function decideAgentAction(params: {
  agent: AgentComposite;
  perception: AgentPerception;
  world: WorldState;
  rng: SeededRandom;
}): ProposedAction {
  const { agent, perception, world, rng } = params;
  const { needs, inventory, energy } = agent.state;
  const { personality, strategyWeights, currentRole } = agent;
  const candidates: ProposedAction[] = [];

  const memoryBonus = (category: string): number => {
    if (!world.rules.memoryEnabled || perception.ownMemories.length === 0) return 0;
    const relevant = perception.ownMemories.filter((m) => m.category === category);
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce(
      (acc, m) => acc + m.emotionalValence * m.importance * m.decayWeight,
      0,
    );
    return Math.max(-18, Math.min(18, (sum / relevant.length) * 20));
  };

  const centralizedBoost = (resourceNeeded: boolean): number => {
    return world.rules.coordinationMode === 'centralized' && resourceNeeded ? 16 : 0;
  };

  // 1. Survival / Needs actions
  if (needs.hunger < 65 && inventory.food >= 1) {
    const urgency = (100 - needs.hunger) * 1.15;
    candidates.push({
      agentId: agent.id,
      actionType: 'consume_food',
      target: 'personal-ration',
      resource: 'food',
      utilityScore: urgency + personality.resourceSaving * 4,
      reason: `Hunger at ${Math.round(needs.hunger)}%; consuming stored food.`,
    });
  }

  if (needs.health < 55 && inventory.money >= world.marketPrices.healthcare) {
    candidates.push({
      agentId: agent.id,
      actionType: 'seek_healthcare',
      target: 'metrocore-hosp-1',
      resource: 'healthcare',
      utilityScore: (100 - needs.health) * 1.2 + personality.resourceSaving * 5,
      reason: `Health dropped to ${Math.round(needs.health)}%; seeking medical care.`,
    });
  }

  if (energy < 32 || needs.rest < 36) {
    candidates.push({
      agentId: agent.id,
      actionType: 'rest',
      target: agent.state.currentBuildingId,
      utilityScore: (100 - energy) * 1.1 * strategyWeights.rest,
      reason: `Low energy (${Math.round(energy)}%); recovering at local facility.`,
    });
  }

  // 2. Buy food if hungry and out of food
  if (inventory.food < 2 && inventory.money >= world.marketPrices.food) {
    candidates.push({
      agentId: agent.id,
      actionType: 'trade_buy',
      target: 'food',
      resource: 'food',
      utilityScore:
        (100 - needs.hunger) * 1.1 +
        18 * strategyWeights.trade +
        memoryBonus('trade'),
      reason: `Low food stock (${inventory.food}); buying food at ${world.marketPrices.food} EC.`,
    });
  }

  // 3. Role-aligned Production
  if (energy >= 24) {
    const foodDeficit = world.marketPrices.food > 14;
    const energyDeficit = world.marketPrices.energy > 17;
    const produceNeed =
      currentRole === 'farmer'
        ? foodDeficit
        : currentRole === 'engineer'
          ? energyDeficit
          : false;

    const produceUtility =
      (38 + (100 - needs.purpose) * 0.45 + personality.resourceSaving * 10) *
        strategyWeights.produce +
      memoryBonus('economy') +
      centralizedBoost(produceNeed);

    candidates.push({
      agentId: agent.id,
      actionType: 'produce',
      target: perception.community.buildings[0]?.buildingId ?? perception.community.id,
      utilityScore: produceUtility,
      reason: `Executing ${currentRole} production in ${perception.community.name}.`,
    });
  }

  // 4. Trade surplus resources for Echo Credits
  const sellableResource: ResourceType | null =
    inventory.food >= 5
      ? 'food'
      : inventory.materials >= 4
        ? 'materials'
        : inventory.energy >= 5
          ? 'energy'
          : inventory.knowledge >= 4
            ? 'knowledge'
            : null;

  if (sellableResource) {
    const trustedBuyer = perception.localPeers
      .slice()
      .sort((a, b) => b.trust - a.trust)[0];

    candidates.push({
      agentId: agent.id,
      actionType: 'trade_sell',
      target: sellableResource,
      targetAgentId: trustedBuyer?.id,
      resource: sellableResource,
      utilityScore:
        (34 + personality.riskTolerance * 12 + (inventory.money < 90 ? 18 : 0)) *
          strategyWeights.trade +
        memoryBonus('trade'),
      reason: `Selling surplus ${sellableResource} to build Echo Credits.`,
    });
  }

  // 5. Cooperate on joint project with a local peer
  if (perception.localPeers.length > 0 && energy >= 26) {
    const partner = perception.localPeers
      .slice()
      .sort((a, b) => b.trust - a.trust)[0];
    const trustFactor = partner.trust * 18;
    const coopUtility =
      (28 + personality.cooperation * 34 + trustFactor + (100 - needs.social) * 0.35) *
        strategyWeights.cooperate +
      memoryBonus('cooperation');

    candidates.push({
      agentId: agent.id,
      actionType: 'cooperate',
      target: partner.id,
      targetAgentId: partner.id,
      utilityScore: coopUtility,
      reason: `Collaborating with ${partner.name} (trust ${partner.trust.toFixed(2)}).`,
    });
  }

  // 6. Research & Innovation (especially researchers, teachers, or high curiosity)
  if (energy >= 28 && (currentRole === 'researcher' || currentRole === 'teacher' || personality.curiosity > 0.65)) {
    candidates.push({
      agentId: agent.id,
      actionType: 'research',
      target: 'novadistrict-lab-1',
      resource: 'knowledge',
      utilityScore:
        (30 + personality.curiosity * 28) * strategyWeights.innovate +
        memoryBonus('learning'),
      reason: 'Advancing applied knowledge and productivity methods.',
    });
  }

  // 7. Create Business (Entrepreneurs or high riskTolerance with capital)
  if (
    inventory.money >= 180 &&
    inventory.materials >= 2 &&
    (currentRole === 'entrepreneur' || personality.riskTolerance > 0.68)
  ) {
    candidates.push({
      agentId: agent.id,
      actionType: 'create_business',
      target: 'metrocore-biz-1',
      utilityScore:
        (32 + personality.riskTolerance * 26) * strategyWeights.innovate +
        memoryBonus('economy'),
      reason: 'Investing 150 EC + 2 materials to launch a local micro-venture.',
    });
  }

  // 8. Construct / Maintain Infrastructure (Engineers or materials holders)
  if (inventory.materials >= 3 && energy >= 28 && (currentRole === 'engineer' || perception.community.infrastructureLevel < 75)) {
    candidates.push({
      agentId: agent.id,
      actionType: 'construct',
      target: perception.community.id,
      resource: 'materials',
      utilityScore:
        (29 + (100 - perception.community.infrastructureLevel) * 0.8 + personality.cooperation * 12) +
        centralizedBoost(perception.community.infrastructureLevel < 72),
      reason: `Upgrading ${perception.community.name} infrastructure using 2 materials.`,
    });
  }

  // 9. Socialize in Park / Commons
  if (perception.localPeers.length > 0) {
    const peer = rng.pick(perception.localPeers);
    candidates.push({
      agentId: agent.id,
      actionType: 'socialize',
      target: peer.id,
      targetAgentId: peer.id,
      utilityScore: 20 + (100 - needs.social) * 0.6 + personality.cooperation * 10,
      reason: `Socializing in public commons with ${peer.name}.`,
    });
  }

  // 10. Migrate between communities when permitted
  if (world.rules.allowMigration && energy >= 30 && perception.otherCommunitiesSummary.length > 0) {
    const bestOther = perception.otherCommunitiesSummary
      .slice()
      .sort((a, b) => b.infrastructureLevel - a.infrastructureLevel)[0];
    const crowdPenalty = perception.communityPopulation > 12 ? 18 : 0;
    const shockPenalty = perception.activeLocalEvents.length > 0 ? 14 : 0;

    candidates.push({
      agentId: agent.id,
      actionType: 'migrate',
      target: bestOther.id,
      targetCommunityId: bestOther.id,
      utilityScore:
        (12 + crowdPenalty + shockPenalty + personality.adaptability * 14) *
          strategyWeights.migrate +
        memoryBonus('migration'),
      reason: `Evaluating relocation to ${bestOther.name} for opportunity.`,
    });
  }

  // Deterministic tie-breaking jitter from seeded PRNG
  let best = candidates[0] ?? {
    agentId: agent.id,
    actionType: 'rest' as const,
    target: agent.state.currentBuildingId,
    utilityScore: 10,
    reason: 'Default rest cycle.',
  };

  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const scoreWithSeedJitter = candidate.utilityScore + rng.range(0, 2.5);
    if (scoreWithSeedJitter > bestScore) {
      bestScore = scoreWithSeedJitter;
      best = {
        ...candidate,
        utilityScore: Number(scoreWithSeedJitter.toFixed(2)),
      };
    }
  }

  return best;
}
