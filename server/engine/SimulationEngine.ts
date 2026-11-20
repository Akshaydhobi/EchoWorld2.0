import type {
  AgentComposite,
  MemoryRecord,
  RelationshipRecord,
  SnapshotRecord,
  TransactionRecord,
  WorldEventRecord,
} from '../../src/types/simulation.ts';
import type { WorldState } from '../../src/types/world.ts';
import { resolveProposedActions } from './ActionEngine.ts';
import { updateMarketPrices } from './EconomyEngine.ts';
import { updateWorldEvents } from './EventEngine.ts';
import { reflectAndAdaptAgent } from './LearningEngine.ts';
import { maintainAgentMemories } from './MemoryEngine.ts';
import { calculateTickSnapshot } from './MetricsCalculator.ts';
import { buildAgentPerception } from './PerceptionEngine.ts';
import { decideAgentAction } from './DecisionEngine.ts';
import { SeededRandom } from './prng.ts';

export interface SimulationExecutionContext {
  world: WorldState;
  agents: AgentComposite[];
  relationships: RelationshipRecord[];
  activeEvents: WorldEventRecord[];
  memoriesByAgent: Map<string, MemoryRecord[]>;
}

export interface TickExecutionOutput {
  snapshot: SnapshotRecord;
  newTransactions: TransactionRecord[];
  newEvents: WorldEventRecord[];
}

function clampStat(v: number): number {
  return Number(Math.max(0, Math.min(100, v)).toFixed(1));
}

/**
 * Executes the 12-Step Discrete Simulation Tick deterministically.
 * Shared identically by both live SimulationManager and Research Laboratory ExperimentRunner.
 */
export function executeSingleTick(ctx: SimulationExecutionContext): TickExecutionOutput {
  const { world, agents, relationships, activeEvents, memoriesByAgent } = ctx;

  // Step 1: Initialize tick context & restore deterministic PRNG state
  world.currentTick += 1;
  const rng = new SeededRandom(world.seed);
  rng.setState(world.prngState);

  // Step 2: Update environmental conditions & roll organic events
  const eventUpdate = updateWorldEvents({
    world,
    activeEvents,
    rng,
  });
  activeEvents.length = 0;
  activeEvents.push(...eventUpdate.stillActive);

  // Apply base metabolic/need decay & environmental wellbeing shifts
  const decay = world.rules.baseDecayRate;
  for (const agent of agents) {
    agent.state.tick = world.currentTick;
    agent.state.needs.hunger = clampStat(agent.state.needs.hunger - decay * 1.4);
    agent.state.needs.rest = clampStat(agent.state.needs.rest - decay * 1.1);
    agent.state.needs.social = clampStat(agent.state.needs.social - decay * 0.8);
    agent.state.needs.purpose = clampStat(agent.state.needs.purpose - decay * 0.7);

    // Passive energy consumption if available
    if (agent.state.inventory.energy >= 0.25) {
      agent.state.inventory.energy = Number((agent.state.inventory.energy - 0.25).toFixed(2));
    } else {
      agent.state.energy = clampStat(agent.state.energy - 2);
    }

    for (const ev of activeEvents) {
      if (
        (ev.targetCommunity === 'all' || ev.targetCommunity === agent.state.currentCommunity) &&
        ev.modifiers.wellbeingDelta
      ) {
        agent.state.needs.health = clampStat(
          agent.state.needs.health + ev.modifiers.wellbeingDelta * 0.35,
        );
      }
    }
  }

  // Step 3 & Step 4: Generate bounded observations & calculate independent decisions
  const proposals = agents.map((agent) => {
    const perception = buildAgentPerception({
      agent,
      allAgents: agents,
      world,
      relationships,
      activeEvents,
      agentMemories: memoriesByAgent.get(agent.id) ?? [],
    });

    return decideAgentAction({
      agent,
      perception,
      world,
      rng,
    });
  });

  // Step 5, 6, 7, 8: Validate proposals, resolve interactions/conflicts, update resources & relationships
  const actionResult = resolveProposedActions({
    world,
    agents,
    proposals,
    relationships,
    activeEvents,
    memoriesByAgent,
    rng,
  });

  // Update market supply/demand prices & agent composite wellbeing
  world.marketPrices = updateMarketPrices(world, agents, activeEvents);

  for (const agent of agents) {
    if (agent.state.needs.hunger < 20) {
      agent.state.needs.health = clampStat(agent.state.needs.health - 2.5);
    }
    const { hunger, rest, health, social, purpose } = agent.state.needs;
    agent.state.wellbeing = Number(
      ((hunger + rest + health + social + purpose) / 5).toFixed(1),
    );
  }

  // Step 9: Update memories (decay/promote) & Learning Engine reflection
  if (world.rules.memoryEnabled) {
    maintainAgentMemories(memoriesByAgent);
  }
  for (const agent of agents) {
    reflectAndAdaptAgent(agent, world.rules.memoryEnabled);
  }

  // Save updated PRNG state onto World for pause/resume reproducibility
  world.prngState = rng.getState();

  // Step 10: Calculate research metrics snapshot
  const snapshot = calculateTickSnapshot({
    world,
    agents,
    activeEvents,
    cooperativeActionsThisTick: actionResult.cooperativeActionsCount,
    successfulActionsThisTick: actionResult.successfulActionsCount,
  });

  return {
    snapshot,
    newTransactions: actionResult.transactions,
    newEvents: eventUpdate.newlyTriggered,
  };
}
