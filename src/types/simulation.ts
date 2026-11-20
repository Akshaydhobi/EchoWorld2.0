import type { CommunityId, MarketPrices, WorldRules, WorldState } from './world.ts';

export type AgentRole =
  | 'entrepreneur'
  | 'farmer'
  | 'engineer'
  | 'researcher'
  | 'trader'
  | 'healthcare'
  | 'teacher'
  | 'citizen';

export type ResourceType =
  | 'money'
  | 'food'
  | 'energy'
  | 'materials'
  | 'knowledge'
  | 'healthcare';

export type ActionType =
  | 'produce'
  | 'consume_food'
  | 'rest'
  | 'seek_healthcare'
  | 'trade_buy'
  | 'trade_sell'
  | 'cooperate'
  | 'create_business'
  | 'construct'
  | 'research'
  | 'migrate'
  | 'switch_role'
  | 'socialize';

export interface PersonalityTraits {
  cooperation: number;
  riskTolerance: number;
  curiosity: number;
  adaptability: number;
  resourceSaving: number;
}

export interface StrategyWeights {
  produce: number;
  trade: number;
  cooperate: number;
  innovate: number;
  rest: number;
  migrate: number;
}

export interface AgentNeeds {
  hunger: number;
  rest: number;
  health: number;
  social: number;
  purpose: number;
}

export interface AgentInventory {
  money: number;
  food: number;
  energy: number;
  materials: number;
  knowledge: number;
  healthcare: number;
}

export interface DecisionLogEntry {
  tick: number;
  actionType: ActionType;
  target: string;
  utilityScore: number;
  outcome: 'success' | 'failed' | 'blocked';
  reason: string;
  moneyAfter: number;
}

export interface AgentProfile {
  id: string;
  worldId: string;
  agentCode: string;
  name: string;
  initialRole: AgentRole;
  currentRole: AgentRole;
  homeCommunity: CommunityId;
  personality: PersonalityTraits;
  shortTermGoal: string;
  longTermGoal: string;
  strategyWeights: StrategyWeights;
}

export interface AgentLiveState {
  agentId: string;
  tick: number;
  currentCommunity: CommunityId;
  currentBuildingId: string;
  position: { x: number; z: number };
  needs: AgentNeeds;
  energy: number;
  wellbeing: number;
  inventory: AgentInventory;
  lastAction: DecisionLogEntry | null;
  decisionHistory: DecisionLogEntry[];
}

export interface AgentComposite extends AgentProfile {
  state: AgentLiveState;
}

export interface MemoryRecord {
  id: string;
  worldId: string;
  agentId: string;
  tick: number;
  tier: 'short_term' | 'long_term';
  category: 'trade' | 'cooperation' | 'conflict' | 'event' | 'learning' | 'migration' | 'economy';
  summary: string;
  relatedAgentId: string | null;
  emotionalValence: number;
  importance: number;
  decayWeight: number;
}

export type EventSource = 'environment' | 'architect_intervention' | 'agent_milestone';

export type WorldEventType =
  | 'weather_disruption'
  | 'energy_shortage'
  | 'resource_scarcity'
  | 'market_shift'
  | 'tech_discovery'
  | 'business_opportunity'
  | 'infrastructure_fault'
  | 'rule_change'
  | 'business_created'
  | 'migration_wave';

export interface WorldEventRecord {
  id: string;
  worldId: string;
  tick: number;
  source: EventSource;
  type: WorldEventType;
  title: string;
  description: string;
  targetCommunity: CommunityId | 'all';
  modifiers: {
    foodOutputMult?: number;
    energyOutputMult?: number;
    materialsOutputMult?: number;
    knowledgeOutputMult?: number;
    priceMult?: number;
    wellbeingDelta?: number;
  };
  durationTicks: number;
  remainingTicks: number;
}

export type TransactionType =
  | 'production'
  | 'consumption'
  | 'trade'
  | 'wage'
  | 'business_create'
  | 'construction'
  | 'research'
  | 'healthcare_service'
  | 'tax';

export interface TransactionRecord {
  id: string;
  worldId: string;
  tick: number;
  txType: TransactionType;
  fromAgentId: string | null;
  toAgentId: string | null;
  resource: ResourceType;
  amount: number;
  unitPriceEC: number;
  communityId: CommunityId;
  note: string;
}

export interface RelationshipRecord {
  id: string;
  worldId: string;
  agentA: string;
  agentB: string;
  trust: number;
  affinity: number;
  interactionCount: number;
  successfulTrades: number;
  conflicts: number;
  lastInteractionTick: number;
}

export interface CommunityMetricSummary {
  communityId: CommunityId;
  name: string;
  population: number;
  avgWellbeing: number;
  totalWealthEC: number;
}

export interface SnapshotRecord {
  id: string;
  worldId: string;
  tick: number;
  populationActive: number;
  avgWellbeing: number;
  cooperationRate: number;
  wealthGini: number;
  decisionSuccessRate: number;
  totalResources: AgentInventory;
  marketPrices: MarketPrices;
  communityStats: CommunityMetricSummary[];
  activeEventCount: number;
}

export type ResearchQuestionId =
  | 'cooperation_vs_independence'
  | 'memory_vs_nomemory'
  | 'resource_scarcity'
  | 'personality_diversity'
  | 'centralized_vs_decentralized'
  | 'event_adaptability';

export interface ExperimentVariantSpec {
  label: string;
  ruleOverrides: Partial<WorldRules>;
  personalityCooperationBias?: number;
  personalityDiversityScale?: number;
  initialScarcityFactor?: number;
  injectShockAtTick?: number;
}

export interface ExperimentTimePoint {
  tick: number;
  avgWellbeing: number;
  cooperationRate: number;
  wealthGini: number;
  decisionSuccessRate: number;
  totalFood: number;
  totalEnergy: number;
  totalMoney: number;
}

export interface ExperimentRunResult {
  variantLabel: string;
  seed: number;
  finalAvgWellbeing: number;
  meanCooperationRate: number;
  finalWealthGini: number;
  decisionSuccessRate: number;
  recoveryTicks: number | null;
  resourceTotals: AgentInventory;
  timeSeries: ExperimentTimePoint[];
}

export interface ExperimentRecord {
  id: string;
  name: string;
  researchQuestion: ResearchQuestionId;
  ticksToRun: number;
  seeds: number[];
  variants: ExperimentVariantSpec[];
  results: ExperimentRunResult[];
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface FullSimulationBundle {
  world: WorldState;
  agents: AgentComposite[];
  relationships: RelationshipRecord[];
  activeEvents: WorldEventRecord[];
  recentEvents: WorldEventRecord[];
  recentTransactions: TransactionRecord[];
  snapshots: SnapshotRecord[];
  latestSnapshot: SnapshotRecord | null;
}
