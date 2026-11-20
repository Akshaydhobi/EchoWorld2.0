import crypto from 'crypto';
import type {
  EventSource,
  WorldEventRecord,
  WorldEventType,
} from '../../src/types/simulation.ts';
import type { CommunityId, WorldState } from '../../src/types/world.ts';
import type { SeededRandom } from './prng.ts';

interface EventTemplate {
  type: WorldEventType;
  title: string;
  description: string;
  modifiers: WorldEventRecord['modifiers'];
  durationTicks: number;
}

const EVENT_TEMPLATES: Record<
  Exclude<WorldEventType, 'rule_change' | 'business_created' | 'migration_wave'>,
  EventTemplate
> = {
  weather_disruption: {
    type: 'weather_disruption',
    title: 'Severe Storm Front',
    description: 'High winds and heavy rain temporarily reduce agricultural yields.',
    modifiers: { foodOutputMult: 0.6, wellbeingDelta: -2 },
    durationTicks: 6,
  },
  energy_shortage: {
    type: 'energy_shortage',
    title: 'Grid Load Deficit',
    description: 'Peak demand strains power facilities, reducing energy output and raising prices.',
    modifiers: { energyOutputMult: 0.55, priceMult: 1.15 },
    durationTicks: 5,
  },
  resource_scarcity: {
    type: 'resource_scarcity',
    title: 'Raw Material Bottleneck',
    description: 'Supply chain friction restricts material extraction and raises costs.',
    modifiers: { materialsOutputMult: 0.55, priceMult: 1.2 },
    durationTicks: 6,
  },
  market_shift: {
    type: 'market_shift',
    title: 'Inter-District Demand Surge',
    description: 'Rapid trade shifts lift commodity prices across Echo City markets.',
    modifiers: { priceMult: 1.25 },
    durationTicks: 5,
  },
  tech_discovery: {
    type: 'tech_discovery',
    title: 'Applied Research Breakthrough',
    description: 'Laboratory optimization boosts knowledge and clean energy output.',
    modifiers: { knowledgeOutputMult: 1.45, energyOutputMult: 1.2, wellbeingDelta: 3 },
    durationTicks: 7,
  },
  business_opportunity: {
    type: 'business_opportunity',
    title: 'Commercial Expansion Cycle',
    description: 'New consumer demand creates favorable margins for entrepreneurs and traders.',
    modifiers: { materialsOutputMult: 1.25, priceMult: 0.92, wellbeingDelta: 2 },
    durationTicks: 6,
  },
  infrastructure_fault: {
    type: 'infrastructure_fault',
    title: 'Transit & Utility Fault',
    description: 'Aging conduits require engineer maintenance and slow local productivity.',
    modifiers: { foodOutputMult: 0.85, energyOutputMult: 0.75, wellbeingDelta: -3 },
    durationTicks: 5,
  },
};

export function createWorldEvent(params: {
  worldId: string;
  tick: number;
  source: EventSource;
  type: WorldEventType;
  targetCommunity?: CommunityId | 'all';
  customTitle?: string;
  customDescription?: string;
  durationTicks?: number;
}): WorldEventRecord {
  const {
    worldId,
    tick,
    source,
    type,
    targetCommunity = 'all',
    customTitle,
    customDescription,
    durationTicks,
  } = params;

  const template =
    type in EVENT_TEMPLATES
      ? EVENT_TEMPLATES[type as keyof typeof EVENT_TEMPLATES]
      : null;

  return {
    id: crypto.randomUUID(),
    worldId,
    tick,
    source,
    type,
    title: customTitle ?? template?.title ?? type,
    description: customDescription ?? template?.description ?? 'World state update recorded.',
    targetCommunity,
    modifiers: template?.modifiers ?? {},
    durationTicks: durationTicks ?? template?.durationTicks ?? 4,
    remainingTicks: durationTicks ?? template?.durationTicks ?? 4,
  };
}

/**
 * Advances active event durations and optionally generates organic environmental events
 * using the world's seeded PRNG.
 */
export function updateWorldEvents(params: {
  world: WorldState;
  activeEvents: WorldEventRecord[];
  rng: SeededRandom;
}): {
  stillActive: WorldEventRecord[];
  newlyTriggered: WorldEventRecord[];
} {
  const { world, activeEvents, rng } = params;
  const stillActive: WorldEventRecord[] = [];
  const newlyTriggered: WorldEventRecord[] = [];

  for (const ev of activeEvents) {
    const nextRemaining = ev.remainingTicks - 1;
    if (nextRemaining > 0) {
      ev.remainingTicks = nextRemaining;
      stillActive.push(ev);
    }
  }

  // Organic environment event probability (~9% per tick when fewer than 2 active shocks)
  if (world.rules.randomEventsEnabled && stillActive.length < 2 && rng.next() < 0.09) {
    const types = Object.keys(EVENT_TEMPLATES) as Array<keyof typeof EVENT_TEMPLATES>;
    const chosenType = rng.pick(types);
    const districts: Array<CommunityId | 'all'> = [
      'greenfield',
      'metrocore',
      'novadistrict',
      'all',
    ];
    const targetCommunity =
      chosenType === 'weather_disruption' ? 'greenfield' : rng.pick(districts);

    const newEv = createWorldEvent({
      worldId: world.id,
      tick: world.currentTick,
      source: 'environment',
      type: chosenType,
      targetCommunity,
    });
    stillActive.push(newEv);
    newlyTriggered.push(newEv);
  }

  return { stillActive, newlyTriggered };
}
