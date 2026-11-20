import type {
  AgentComposite,
  ExperimentRecord,
  FullSimulationBundle,
  MemoryRecord,
  ResearchQuestionId,
  WorldEventType,
} from '../types/simulation.ts';
import type { CommunityId, WorldHealth, WorldRules, WorldState } from '../types/world.ts';

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function fetchHealth(): Promise<WorldHealth> {
  const res = await fetch('/api/health');
  return parseJsonOrThrow<WorldHealth>(res);
}

export async function fetchSimulationBundle(): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/bundle');
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function startSimulation(): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/start', { method: 'POST' });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function pauseSimulation(): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/pause', { method: 'POST' });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function stepSimulation(): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/step', { method: 'POST' });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function resetSimulation(seed: number): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed }),
  });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function updateSimulationSpeed(tickIntervalMs: number): Promise<FullSimulationBundle> {
  const res = await fetch('/api/sim/speed', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickIntervalMs }),
  });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function patchWorldRules(rules: Partial<WorldRules>): Promise<WorldState> {
  const res = await fetch('/api/world/rules', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  });
  return parseJsonOrThrow<WorldState>(res);
}

export async function triggerWorldEvent(params: {
  type: WorldEventType;
  targetCommunity: CommunityId | 'all';
}): Promise<FullSimulationBundle> {
  const res = await fetch('/api/events/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow<FullSimulationBundle>(res);
}

export async function fetchAgentDetails(agentId: string): Promise<{
  agent: AgentComposite;
  memories: MemoryRecord[];
}> {
  const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}`);
  return parseJsonOrThrow<{ agent: AgentComposite; memories: MemoryRecord[] }>(res);
}

export async function fetchExperiments(): Promise<ExperimentRecord[]> {
  const res = await fetch('/api/research/experiments');
  const data = await parseJsonOrThrow<{ experiments: ExperimentRecord[] }>(res);
  return data.experiments;
}

export async function runExperiment(params: {
  name?: string;
  researchQuestion: ResearchQuestionId;
  ticksToRun: number;
  seeds: number[];
}): Promise<ExperimentRecord> {
  const res = await fetch('/api/research/experiments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJsonOrThrow<{ experiment: ExperimentRecord }>(res);
  return data.experiment;
}
