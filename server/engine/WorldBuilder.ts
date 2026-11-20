import {
  COMMUNITY_DEFINITIONS,
  DEFAULT_MARKET_PRICES,
  DEFAULT_TICK_INTERVAL_MS,
  DEFAULT_WORLD_RULES,
  WORLD_NAME,
} from '../config/constants.ts';
import type {
  Building,
  BuildingType,
  Community,
  CommunityId,
  WorldRules,
  WorldState,
} from '../../src/types/world.ts';
import { SeededRandom } from './prng.ts';

interface BuildingBlueprint {
  suffix: string;
  name: string;
  type: BuildingType;
  offsetX: number;
  offsetZ: number;
  capacity: number;
  description: string;
}

const DISTRICT_BLUEPRINTS: Record<CommunityId, BuildingBlueprint[]> = {
  greenfield: [
    {
      suffix: 'res-1',
      name: 'Clover Residential Commons',
      type: 'residential',
      offsetX: -6,
      offsetZ: -6,
      capacity: 14,
      description: 'Low-rise timber housing block for Greenfield residents.',
    },
    {
      suffix: 'farm-1',
      name: 'Sunridge Hydro Farm',
      type: 'farm',
      offsetX: 6,
      offsetZ: -6,
      capacity: 10,
      description: 'Primary grain, produce, and protein cultivation facility.',
    },
    {
      suffix: 'farm-2',
      name: 'Terrace Greenhouse',
      type: 'farm',
      offsetX: 6,
      offsetZ: 6,
      capacity: 8,
      description: 'Climate-buffered vertical crop beds.',
    },
    {
      suffix: 'mkt-1',
      name: 'Greenfield Harvest Market',
      type: 'market',
      offsetX: -6,
      offsetZ: 6,
      capacity: 16,
      description: 'Local food and materials exchange hall.',
    },
    {
      suffix: 'sch-1',
      name: 'Oakwood Civic School',
      type: 'school',
      offsetX: 0,
      offsetZ: -10,
      capacity: 12,
      description: 'Foundational literacy and agricultural trade school.',
    },
    {
      suffix: 'prk-1',
      name: 'Meadowbrook Park',
      type: 'park',
      offsetX: 0,
      offsetZ: 10,
      capacity: 20,
      description: 'Public green commons improving community rest and morale.',
    },
    {
      suffix: 'trn-1',
      name: 'Greenfield Transit Loop',
      type: 'road_transit',
      offsetX: 11,
      offsetZ: 0,
      capacity: 24,
      description: 'Electric road corridor connecting Greenfield to MetroCore.',
    },
  ],
  metrocore: [
    {
      suffix: 'res-1',
      name: 'Axis Residential Tower',
      type: 'residential',
      offsetX: -7,
      offsetZ: -7,
      capacity: 18,
      description: 'High-density urban apartments near commercial corridors.',
    },
    {
      suffix: 'biz-1',
      name: 'Meridian Business Centre',
      type: 'business_centre',
      offsetX: 6,
      offsetZ: -6,
      capacity: 16,
      description: 'Enterprise registry, startup offices, and capital clearinghouse.',
    },
    {
      suffix: 'mkt-1',
      name: 'Metro Central Exchange',
      type: 'market',
      offsetX: -6,
      offsetZ: 6,
      capacity: 24,
      description: 'Echo City main commodity pricing and inter-district trade floor.',
    },
    {
      suffix: 'hosp-1',
      name: 'Echo General Hospital',
      type: 'hospital',
      offsetX: 7,
      offsetZ: 7,
      capacity: 14,
      description: 'Full-service medical centre delivering healthcare services.',
    },
    {
      suffix: 'prk-1',
      name: 'Civic Plaza & Commons',
      type: 'park',
      offsetX: 0,
      offsetZ: 11,
      capacity: 22,
      description: 'Public plaza where agents socialize and form new ties.',
    },
    {
      suffix: 'trn-1',
      name: 'MetroCore Central Transit',
      type: 'road_transit',
      offsetX: 0,
      offsetZ: -11,
      capacity: 30,
      description: 'Cross-city arterial highway and rail interchange.',
    },
  ],
  novadistrict: [
    {
      suffix: 'res-1',
      name: 'Helix Residential Pods',
      type: 'residential',
      offsetX: -6,
      offsetZ: -6,
      capacity: 16,
      description: 'Modular living quarters for engineers and researchers.',
    },
    {
      suffix: 'lab-1',
      name: 'Quantum Systems Lab',
      type: 'research_lab',
      offsetX: 6,
      offsetZ: -6,
      capacity: 12,
      description: 'Applied science lab generating knowledge and tech breakthroughs.',
    },
    {
      suffix: 'eng-1',
      name: 'Aether Solar & Grid Plant',
      type: 'energy_facility',
      offsetX: 7,
      offsetZ: 6,
      capacity: 12,
      description: 'Primary clean energy generation and grid balancing station.',
    },
    {
      suffix: 'sch-1',
      name: 'Nova Polytech Academy',
      type: 'school',
      offsetX: -6,
      offsetZ: 6,
      capacity: 14,
      description: 'Advanced engineering and systems curriculum centre.',
    },
    {
      suffix: 'biz-1',
      name: 'Venture Foundry Hub',
      type: 'business_centre',
      offsetX: 0,
      offsetZ: -10,
      capacity: 12,
      description: 'Deep-tech commercialization incubator.',
    },
    {
      suffix: 'prk-1',
      name: 'Observatory Promenade',
      type: 'park',
      offsetX: 0,
      offsetZ: 10,
      capacity: 18,
      description: 'Quiet reflection garden overlooking the research quarter.',
    },
    {
      suffix: 'trn-1',
      name: 'Nova Maglev Corridor',
      type: 'road_transit',
      offsetX: -11,
      offsetZ: 0,
      capacity: 24,
      description: 'High-speed transit link connecting NovaDistrict to MetroCore.',
    },
  ],
};

export interface BuildWorldOptions {
  seed: number;
  rules?: Partial<WorldRules>;
  tickIntervalMs?: number;
}

/**
 * Deterministically constructs Echo City with 3 communities and all 10 required
 * infrastructure categories ready for M2 agent spawning.
 */
export function buildEchoCityWorld(options: BuildWorldOptions): Omit<WorldState, 'id' | 'createdAt' | 'updatedAt'> {
  const rng = new SeededRandom(options.seed);

  const communities: Community[] = COMMUNITY_DEFINITIONS.map((def) => {
    const blueprints = DISTRICT_BLUEPRINTS[def.id];
    const buildings: Building[] = blueprints.map((bp) => {
      // Subtle seeded condition variance (92..100) for realism while preserving reproducibility
      const condition = rng.nextInt(92, 100);
      return {
        buildingId: `${def.id}-${bp.suffix}`,
        name: bp.name,
        type: bp.type,
        communityId: def.id,
        position: {
          x: def.center.x + bp.offsetX,
          y: 0,
          z: def.center.z + bp.offsetZ,
        },
        capacity: bp.capacity,
        condition,
        description: bp.description,
      };
    });

    return {
      ...def,
      buildings,
    };
  });

  return {
    name: WORLD_NAME,
    seed: options.seed,
    prngState: rng.getState(),
    currentTick: 0,
    status: 'idle',
    tickIntervalMs: options.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
    communities,
    marketPrices: { ...DEFAULT_MARKET_PRICES },
    rules: {
      ...DEFAULT_WORLD_RULES,
      ...options.rules,
    },
  };
}
