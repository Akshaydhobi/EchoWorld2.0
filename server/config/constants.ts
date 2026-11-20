import type {
  BuildingType,
  CommunityId,
  MarketPrices,
  WorldRules,
} from '../../src/types/world.ts';

export const WORLD_NAME = 'ECHO CITY';
export const DEFAULT_WORLD_SEED = Number(process.env.DEFAULT_WORLD_SEED) || 2026;
export const DEFAULT_TICK_INTERVAL_MS = 1000;
export const CURRENCY_UNIT = 'EC'; // Fictional Echo Credits

export const REQUIRED_BUILDING_TYPES: BuildingType[] = [
  'residential',
  'business_centre',
  'farm',
  'research_lab',
  'hospital',
  'school',
  'market',
  'energy_facility',
  'road_transit',
  'park',
];

export const COMMUNITY_DEFINITIONS: Array<{
  id: CommunityId;
  name: string;
  focus: 'residential_agricultural' | 'business_commercial' | 'tech_research';
  summary: string;
  center: { x: number; y: number; z: number };
  infrastructureLevel: number;
  targetInitialPopulation: number;
}> = [
  {
    id: 'greenfield',
    name: 'Greenfield',
    focus: 'residential_agricultural',
    summary: 'Residential and agricultural heartland producing food and housing.',
    center: { x: -32, y: 0, z: 0 },
    infrastructureLevel: 76,
    targetInitialPopulation: 10,
  },
  {
    id: 'metrocore',
    name: 'MetroCore',
    focus: 'business_commercial',
    summary: 'Business and commercial hub anchored by markets, trade towers, and clinics.',
    center: { x: 0, y: 0, z: 0 },
    infrastructureLevel: 88,
    targetInitialPopulation: 10,
  },
  {
    id: 'novadistrict',
    name: 'NovaDistrict',
    focus: 'tech_research',
    summary: 'Technology and research quarter housing laboratories, power grids, and academies.',
    center: { x: 32, y: 0, z: 0 },
    infrastructureLevel: 84,
    targetInitialPopulation: 10,
  },
];

export const DEFAULT_MARKET_PRICES: MarketPrices = {
  food: 12,
  energy: 15,
  materials: 20,
  knowledge: 28,
  healthcare: 24,
};

export const DEFAULT_WORLD_RULES: WorldRules = {
  allowMigration: true,
  allowRoleChange: true,
  memoryEnabled: true,
  coordinationMode: 'decentralized',
  taxRate: 0.08,
  baseDecayRate: 2.5,
  randomEventsEnabled: true,
};
