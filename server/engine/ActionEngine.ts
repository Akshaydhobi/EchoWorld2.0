import type {
  AgentComposite,
  DecisionLogEntry,
  MemoryRecord,
  RelationshipRecord,
  TransactionRecord,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { BuildingType, WorldState } from '../../src/types/world.ts';
import type { ProposedAction } from './DecisionEngine.ts';
import {
  canSpend,
  createTransaction,
  creditResource,
  debitResource,
  getCommunityEventModifiers,
} from './EconomyEngine.ts';
import { addAgentMemory } from './MemoryEngine.ts';
import type { SeededRandom } from './prng.ts';
import { maybeAdaptAgentRole, recordSocialOutcome } from './SocialEngine.ts';

function clampStat(val: number): number {
  return Number(Math.max(0, Math.min(100, val)).toFixed(1));
}

function moveAgentToBuildingType(
  agent: AgentComposite,
  world: WorldState,
  preferredTypes: BuildingType[],
  rng: SeededRandom,
): void {
  const comm = world.communities.find((c) => c.id === agent.state.currentCommunity);
  if (!comm) return;
  const building =
    comm.buildings.find((b) => preferredTypes.includes(b.type)) ?? comm.buildings[0];
  if (!building) return;

  agent.state.currentBuildingId = building.buildingId;
  agent.state.position = {
    x: Number((building.position.x + rng.range(-1.8, 1.8)).toFixed(2)),
    z: Number((building.position.z + rng.range(-1.8, 1.8)).toFixed(2)),
  };
}

export interface ActionResolutionResult {
  transactions: TransactionRecord[];
  emittedEvents: WorldEventRecord[];
  cooperativeActionsCount: number;
  successfulActionsCount: number;
}

/**
 * Action Engine: validates proposed actions against real inventories and rules,
 * prevents negative balances, resolves interactions/contention, and updates
 * resources, positions, relationships, and private memories.
 */
export function resolveProposedActions(params: {
  world: WorldState;
  agents: AgentComposite[];
  proposals: ProposedAction[];
  relationships: RelationshipRecord[];
  activeEvents: WorldEventRecord[];
  memoriesByAgent: Map<string, MemoryRecord[]>;
  rng: SeededRandom;
}): ActionResolutionResult {
  const {
    world,
    agents,
    proposals,
    relationships,
    activeEvents,
    memoriesByAgent,
    rng,
  } = params;

  const agentById = new Map(agents.map((a) => [a.id, a]));
  const transactions: TransactionRecord[] = [];
  const emittedEvents: WorldEventRecord[] = [];
  let cooperativeActionsCount = 0;
  let successfulActionsCount = 0;

  // Resolve in descending utility order so higher-urgency actors win scarce market contention
  const ordered = [...proposals].sort((a, b) => b.utilityScore - a.utilityScore);

  for (const proposal of ordered) {
    const agent = agentById.get(proposal.agentId);
    if (!agent) continue;

    const tick = world.currentTick;
    const commId = agent.state.currentCommunity;
    const mods = getCommunityEventModifiers(activeEvents, commId);
    let outcome: DecisionLogEntry['outcome'] = 'success';
    let detailReason = proposal.reason;

    switch (proposal.actionType) {
      case 'consume_food': {
        if (debitResource(agent, 'food', 1)) {
          agent.state.needs.hunger = clampStat(agent.state.needs.hunger + 34);
          agent.state.energy = clampStat(agent.state.energy + 10);
          moveAgentToBuildingType(agent, world, ['residential', 'park'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'consumption',
              fromAgentId: agent.id,
              toAgentId: null,
              resource: 'food',
              amount: 1,
              unitPriceEC: world.marketPrices.food,
              communityId: commId,
              note: `${agent.name} consumed 1 food ration.`,
            }),
          );
        } else {
          outcome = 'failed';
          detailReason = 'No food remaining to consume.';
        }
        break;
      }

      case 'rest': {
        agent.state.needs.rest = clampStat(agent.state.needs.rest + 32);
        agent.state.energy = clampStat(agent.state.energy + 34);
        moveAgentToBuildingType(agent, world, ['residential', 'park'], rng);
        break;
      }

      case 'seek_healthcare': {
        const price = world.marketPrices.healthcare;
        if (debitResource(agent, 'money', price)) {
          agent.state.needs.health = clampStat(agent.state.needs.health + 36);
          agent.state.energy = clampStat(agent.state.energy + 12);
          moveAgentToBuildingType(agent, world, ['hospital'], rng);
          const medic = agents.find(
            (a) => a.currentRole === 'healthcare' && a.id !== agent.id,
          );
          if (medic) {
            creditResource(medic, 'money', price * (1 - world.rules.taxRate));
          }
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'healthcare_service',
              fromAgentId: agent.id,
              toAgentId: medic?.id ?? null,
              resource: 'healthcare',
              amount: 1,
              unitPriceEC: price,
              communityId: commId,
              note: `${agent.name} received medical care.`,
            }),
          );
        } else {
          outcome = 'blocked';
          detailReason = 'Insufficient Echo Credits for healthcare service.';
        }
        break;
      }

      case 'produce': {
        if (agent.state.energy < 14) {
          outcome = 'blocked';
          detailReason = 'Too fatigued to produce.';
          break;
        }
        agent.state.energy = clampStat(agent.state.energy - 14);
        agent.state.needs.purpose = clampStat(agent.state.needs.purpose + 18);

        const knowledgeBonus = 1 + Math.min(0.45, agent.state.inventory.knowledge * 0.03);

        if (agent.currentRole === 'farmer') {
          const produced = Number((2.2 * mods.foodMult * knowledgeBonus).toFixed(2));
          creditResource(agent, 'food', produced);
          moveAgentToBuildingType(agent, world, ['farm'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'production',
              fromAgentId: null,
              toAgentId: agent.id,
              resource: 'food',
              amount: produced,
              unitPriceEC: world.marketPrices.food,
              communityId: commId,
              note: `${agent.name} harvested ${produced} food.`,
            }),
          );
        } else if (agent.currentRole === 'engineer') {
          const produced = Number((2.0 * mods.energyMult * knowledgeBonus).toFixed(2));
          creditResource(agent, 'energy', produced);
          creditResource(agent, 'materials', 0.8);
          moveAgentToBuildingType(agent, world, ['energy_facility'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'production',
              fromAgentId: null,
              toAgentId: agent.id,
              resource: 'energy',
              amount: produced,
              unitPriceEC: world.marketPrices.energy,
              communityId: commId,
              note: `${agent.name} generated ${produced} energy.`,
            }),
          );
        } else if (agent.currentRole === 'researcher' || agent.currentRole === 'teacher') {
          const produced = Number((1.6 * mods.knowledgeMult).toFixed(2));
          creditResource(agent, 'knowledge', produced);
          creditResource(agent, 'money', 14);
          moveAgentToBuildingType(agent, world, ['research_lab', 'school'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'research',
              fromAgentId: null,
              toAgentId: agent.id,
              resource: 'knowledge',
              amount: produced,
              unitPriceEC: world.marketPrices.knowledge,
              communityId: commId,
              note: `${agent.name} produced ${produced} knowledge.`,
            }),
          );
        } else if (agent.currentRole === 'healthcare') {
          creditResource(agent, 'healthcare', 1.5);
          creditResource(agent, 'money', 18);
          moveAgentToBuildingType(agent, world, ['hospital'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'wage',
              fromAgentId: null,
              toAgentId: agent.id,
              resource: 'money',
              amount: 18,
              unitPriceEC: 1,
              communityId: commId,
              note: `${agent.name} earned clinic stipend.`,
            }),
          );
        } else {
          // Entrepreneur, trader, citizen: produce materials & earn service wages
          const mat = Number((1.2 * mods.materialsMult).toFixed(2));
          creditResource(agent, 'materials', mat);
          creditResource(agent, 'money', 16);
          moveAgentToBuildingType(agent, world, ['business_centre', 'market'], rng);
          transactions.push(
            createTransaction({
              worldId: world.id,
              tick,
              txType: 'wage',
              fromAgentId: null,
              toAgentId: agent.id,
              resource: 'money',
              amount: 16,
              unitPriceEC: 1,
              communityId: commId,
              note: `${agent.name} earned civic/commercial wage + ${mat} materials.`,
            }),
          );
        }

        addAgentMemory({
          memoriesByAgent,
          worldId: world.id,
          agentId: agent.id,
          tick,
          category: 'economy',
          summary: `Completed productive work as ${agent.currentRole} in ${commId}.`,
          emotionalValence: 0.45,
          importance: 0.4,
        });
        break;
      }

      case 'trade_buy': {
        const res = proposal.resource ?? 'food';
        const price = res === 'money' ? 1 : world.marketPrices[res];
        // Prefer buying from a local peer with surplus; fallback to district market
        const seller = agents.find(
          (other) =>
            other.id !== agent.id &&
            other.state.currentCommunity === commId &&
            other.state.inventory[res] >= 3,
        );

        if (!canSpend(agent, 'money', price)) {
          outcome = 'blocked';
          detailReason = `Insufficient Echo Credits (${agent.state.inventory.money} EC) to buy ${res}.`;
          addAgentMemory({
            memoriesByAgent,
            worldId: world.id,
            agentId: agent.id,
            tick,
            category: 'trade',
            summary: `Could not afford ${res} (${price} EC).`,
            emotionalValence: -0.5,
            importance: 0.55,
          });
          break;
        }

        debitResource(agent, 'money', price);
        creditResource(agent, res, 1);
        moveAgentToBuildingType(agent, world, ['market'], rng);

        if (seller && debitResource(seller, res, 1)) {
          const tax = Number((price * world.rules.taxRate).toFixed(2));
          creditResource(seller, 'money', Number((price - tax).toFixed(2)));
          recordSocialOutcome({
            relationships,
            worldId: world.id,
            agentAId: agent.id,
            agentBId: seller.id,
            tick,
            kind: 'trade',
          });
          addAgentMemory({
            memoriesByAgent,
            worldId: world.id,
            agentId: agent.id,
            tick,
            category: 'trade',
            summary: `Bought 1 ${res} from ${seller.name} for ${price} EC.`,
            relatedAgentId: seller.id,
            emotionalValence: 0.55,
            importance: 0.52,
          });
        }

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'trade',
            fromAgentId: agent.id,
            toAgentId: seller?.id ?? null,
            resource: res,
            amount: 1,
            unitPriceEC: price,
            communityId: commId,
            note: `${agent.name} purchased 1 ${res} (${price} EC).`,
          }),
        );
        break;
      }

      case 'trade_sell': {
        const res = proposal.resource ?? 'food';
        const price = res === 'money' ? 1 : world.marketPrices[res];
        if (!debitResource(agent, res, 1)) {
          outcome = 'failed';
          detailReason = `No ${res} available to sell.`;
          break;
        }
        const tax = Number((price * world.rules.taxRate).toFixed(2));
        const netRevenue = Number((price - tax).toFixed(2));
        creditResource(agent, 'money', netRevenue);
        moveAgentToBuildingType(agent, world, ['market'], rng);

        if (proposal.targetAgentId) {
          const peer = agentById.get(proposal.targetAgentId);
          if (peer && canSpend(peer, 'money', price)) {
            debitResource(peer, 'money', price);
            creditResource(peer, res, 1);
            recordSocialOutcome({
              relationships,
              worldId: world.id,
              agentAId: agent.id,
              agentBId: peer.id,
              tick,
              kind: 'trade',
            });
          }
        }

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'trade',
            fromAgentId: agent.id,
            toAgentId: proposal.targetAgentId ?? null,
            resource: res,
            amount: 1,
            unitPriceEC: price,
            communityId: commId,
            note: `${agent.name} sold 1 ${res} for ${netRevenue} EC (tax ${tax} EC).`,
          }),
        );
        break;
      }

      case 'cooperate': {
        cooperativeActionsCount += 1;
        const partner = proposal.targetAgentId
          ? agentById.get(proposal.targetAgentId)
          : undefined;
        if (!partner) {
          outcome = 'failed';
          detailReason = 'Cooperation partner unavailable.';
          break;
        }

        const rel = relationships.find(
          (r) =>
            (r.agentA === agent.id && r.agentB === partner.id) ||
            (r.agentA === partner.id && r.agentB === agent.id),
        );

        // Low-trust conflict chance if historical trust is negative
        const conflictChance = rel && rel.trust < -0.15 ? 0.35 : 0.05;
        if (rng.next() < conflictChance) {
          outcome = 'failed';
          detailReason = `Negotiation with ${partner.name} broke down over resource terms.`;
          recordSocialOutcome({
            relationships,
            worldId: world.id,
            agentAId: agent.id,
            agentBId: partner.id,
            tick,
            kind: 'conflict',
          });
          addAgentMemory({
            memoriesByAgent,
            worldId: world.id,
            agentId: agent.id,
            tick,
            category: 'conflict',
            summary: `Cooperation with ${partner.name} failed due to low trust.`,
            relatedAgentId: partner.id,
            emotionalValence: -0.75,
            importance: 0.78,
          });
          break;
        }

        agent.state.energy = clampStat(agent.state.energy - 10);
        agent.state.needs.social = clampStat(agent.state.needs.social + 22);
        agent.state.needs.purpose = clampStat(agent.state.needs.purpose + 16);
        creditResource(agent, 'money', 18);
        creditResource(partner, 'money', 14);
        creditResource(agent, 'knowledge', 0.4);
        moveAgentToBuildingType(agent, world, ['business_centre', 'park'], rng);

        recordSocialOutcome({
          relationships,
          worldId: world.id,
          agentAId: agent.id,
          agentBId: partner.id,
          tick,
          kind: 'cooperation',
        });

        addAgentMemory({
          memoriesByAgent,
          worldId: world.id,
          agentId: agent.id,
          tick,
          category: 'cooperation',
          summary: `Successful joint project with ${partner.name} (+18 EC).`,
          relatedAgentId: partner.id,
          emotionalValence: 0.8,
          importance: 0.74,
        });

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'wage',
            fromAgentId: null,
            toAgentId: agent.id,
            resource: 'money',
            amount: 18,
            unitPriceEC: 1,
            communityId: commId,
            note: `${agent.name} & ${partner.name} completed cooperative project.`,
          }),
        );
        break;
      }

      case 'create_business': {
        if (!canSpend(agent, 'money', 150) || !canSpend(agent, 'materials', 2)) {
          outcome = 'blocked';
          detailReason = 'Requires 150 EC and 2 materials to found a business.';
          break;
        }
        debitResource(agent, 'money', 150);
        debitResource(agent, 'materials', 2);
        creditResource(agent, 'money', 210); // Venture launch revenue return
        agent.state.needs.purpose = clampStat(agent.state.needs.purpose + 26);
        moveAgentToBuildingType(agent, world, ['business_centre'], rng);

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'business_create',
            fromAgentId: agent.id,
            toAgentId: null,
            resource: 'money',
            amount: 150,
            unitPriceEC: 1,
            communityId: commId,
            note: `${agent.name} launched a new local enterprise in ${commId}.`,
          }),
        );

        addAgentMemory({
          memoriesByAgent,
          worldId: world.id,
          agentId: agent.id,
          tick,
          category: 'economy',
          summary: `Founded a venture in ${commId} generating net +60 EC.`,
          emotionalValence: 0.9,
          importance: 0.85,
        });
        break;
      }

      case 'construct': {
        cooperativeActionsCount += 1;
        if (!debitResource(agent, 'materials', 2)) {
          outcome = 'blocked';
          detailReason = 'Needs 2 materials for infrastructure construction.';
          break;
        }
        const comm = world.communities.find((c) => c.id === commId);
        if (comm) {
          comm.infrastructureLevel = Math.min(100, Number((comm.infrastructureLevel + 2.5).toFixed(1)));
        }
        creditResource(agent, 'money', 26);
        agent.state.energy = clampStat(agent.state.energy - 14);
        moveAgentToBuildingType(agent, world, ['road_transit', 'energy_facility'], rng);

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'construction',
            fromAgentId: agent.id,
            toAgentId: null,
            resource: 'materials',
            amount: 2,
            unitPriceEC: world.marketPrices.materials,
            communityId: commId,
            note: `${agent.name} upgraded ${commId} infrastructure (+2.5%).`,
          }),
        );
        break;
      }

      case 'research': {
        agent.state.energy = clampStat(agent.state.energy - 12);
        const gain = Number((2.2 * mods.knowledgeMult).toFixed(2));
        creditResource(agent, 'knowledge', gain);
        creditResource(agent, 'money', 15);
        agent.state.needs.purpose = clampStat(agent.state.needs.purpose + 20);
        moveAgentToBuildingType(agent, world, ['research_lab', 'school'], rng);

        transactions.push(
          createTransaction({
            worldId: world.id,
            tick,
            txType: 'research',
            fromAgentId: null,
            toAgentId: agent.id,
            resource: 'knowledge',
            amount: gain,
            unitPriceEC: world.marketPrices.knowledge,
            communityId: commId,
            note: `${agent.name} discovered +${gain} knowledge.`,
          }),
        );
        break;
      }

      case 'socialize': {
        agent.state.needs.social = clampStat(agent.state.needs.social + 24);
        agent.state.needs.rest = clampStat(agent.state.needs.rest + 8);
        moveAgentToBuildingType(agent, world, ['park'], rng);
        if (proposal.targetAgentId) {
          recordSocialOutcome({
            relationships,
            worldId: world.id,
            agentAId: agent.id,
            agentBId: proposal.targetAgentId,
            tick,
            kind: 'social',
          });
        }
        break;
      }

      case 'migrate': {
        if (!world.rules.allowMigration || !proposal.targetCommunityId) {
          outcome = 'blocked';
          detailReason = 'Migration disabled by Architect rules.';
          break;
        }
        const prevComm = agent.state.currentCommunity;
        agent.state.currentCommunity = proposal.targetCommunityId;
        moveAgentToBuildingType(agent, world, ['road_transit', 'residential'], rng);

        addAgentMemory({
          memoriesByAgent,
          worldId: world.id,
          agentId: agent.id,
          tick,
          category: 'migration',
          summary: `Migrated from ${prevComm} to ${proposal.targetCommunityId}.`,
          emotionalValence: 0.3,
          importance: 0.76,
        });
        break;
      }

      default:
        break;
    }

    // Optional adaptive role change check
    const shiftedRole = maybeAdaptAgentRole({ agent, world, rng });
    if (shiftedRole) {
      addAgentMemory({
        memoriesByAgent,
        worldId: world.id,
        agentId: agent.id,
        tick,
        category: 'learning',
        summary: `Adapted occupation to ${shiftedRole} due to market demand.`,
        emotionalValence: 0.4,
        importance: 0.8,
      });
    }

    if (outcome === 'success') {
      successfulActionsCount += 1;
    }

    const logEntry: DecisionLogEntry = {
      tick,
      actionType: proposal.actionType,
      target: proposal.target,
      utilityScore: proposal.utilityScore,
      outcome,
      reason: detailReason,
      moneyAfter: agent.state.inventory.money,
    };

    agent.state.lastAction = logEntry;
    agent.state.decisionHistory = [logEntry, ...agent.state.decisionHistory].slice(0, 25);
  }

  return {
    transactions,
    emittedEvents,
    cooperativeActionsCount,
    successfulActionsCount,
  };
}
