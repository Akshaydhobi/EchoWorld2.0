export type CommunityId = 'greenfield' | 'metrocore' | 'novadistrict';

export type BuildingType =
  | 'residential'
  | 'business_centre'
  | 'farm'
  | 'research_lab'
  | 'hospital'
  | 'school'
  | 'market'
  | 'energy_facility'
  | 'road_transit'
  | 'park';

export type WorldStatus = 'idle' | 'running' | 'paused';

export type CoordinationMode = 'decentralized' | 'centralized';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Building {
  buildingId: string;
  name: string;
  type: BuildingType;
  communityId: CommunityId;
  position: Position3D;
  capacity: number;
  condition: number;
  description: string;
}

export interface Community {
  id: CommunityId;
  name: string;
  focus: 'residential_agricultural' | 'business_commercial' | 'tech_research';
  summary: string;
  center: Position3D;
  infrastructureLevel: number;
  targetInitialPopulation: number;
  buildings: Building[];
}

export interface MarketPrices {
  food: number;
  energy: number;
  materials: number;
  knowledge: number;
  healthcare: number;
}

export interface WorldRules {
  allowMigration: boolean;
  allowRoleChange: boolean;
  memoryEnabled: boolean;
  coordinationMode: CoordinationMode;
  taxRate: number;
  baseDecayRate: number;
  randomEventsEnabled: boolean;
}

export interface WorldState {
  id: string;
  name: string;
  seed: number;
  prngState: number;
  currentTick: number;
  status: WorldStatus;
  tickIntervalMs: number;
  communities: Community[];
  marketPrices: MarketPrices;
  rules: WorldRules;
  createdAt: string;
  updatedAt: string;
}

export interface WorldHealth {
  ok: boolean;
  storageMode: 'mongodb' | 'memory-fallback';
  uptimeSeconds: number;
  milestone: string;
}
