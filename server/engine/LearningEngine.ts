import type { AgentComposite, StrategyWeights } from '../../src/types/simulation.ts';

function clampWeight(val: number): number {
  return Number(Math.max(0.25, Math.min(2.2, val)).toFixed(2));
}

function mapActionToStrategyKey(
  actionType: string,
): keyof StrategyWeights | null {
  switch (actionType) {
    case 'produce':
      return 'produce';
    case 'trade_buy':
    case 'trade_sell':
      return 'trade';
    case 'cooperate':
    case 'socialize':
      return 'cooperate';
    case 'create_business':
    case 'research':
    case 'construct':
      return 'innovate';
    case 'rest':
    case 'consume_food':
    case 'seek_healthcare':
      return 'rest';
    case 'migrate':
      return 'migrate';
    default:
      return null;
  }
}

/**
 * M6 Learning & Reflection Engine: reinforces strategies that yielded successful
 * outcomes and attenuates repeated failures when memory/learning is active.
 */
export function reflectAndAdaptAgent(
  agent: AgentComposite,
  memoryEnabled: boolean,
): void {
  if (!memoryEnabled) return;
  const last = agent.state.lastAction;
  if (!last) return;

  const key = mapActionToStrategyKey(last.actionType);
  if (!key) return;

  const learningRate = 0.04 + agent.personality.adaptability * 0.06;
  const delta = last.outcome === 'success' ? learningRate : -learningRate * 1.25;

  agent.strategyWeights[key] = clampWeight(agent.strategyWeights[key] + delta);
}
