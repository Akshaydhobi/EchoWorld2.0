import crypto from 'crypto';
import type { MemoryRecord } from '../../src/types/simulation.ts';

const MAX_SHORT_TERM_PER_AGENT = 12;
const MAX_LONG_TERM_PER_AGENT = 18;

export function addAgentMemory(params: {
  memoriesByAgent: Map<string, MemoryRecord[]>;
  worldId: string;
  agentId: string;
  tick: number;
  category: MemoryRecord['category'];
  summary: string;
  relatedAgentId?: string | null;
  emotionalValence: number;
  importance: number;
}): MemoryRecord {
  const {
    memoriesByAgent,
    worldId,
    agentId,
    tick,
    category,
    summary,
    relatedAgentId = null,
    emotionalValence,
    importance,
  } = params;

  const list = memoriesByAgent.get(agentId) ?? [];
  const tier: MemoryRecord['tier'] = importance >= 0.72 ? 'long_term' : 'short_term';

  const record: MemoryRecord = {
    id: crypto.randomUUID(),
    worldId,
    agentId,
    tick,
    tier,
    category,
    summary,
    relatedAgentId,
    emotionalValence: Number(Math.max(-1, Math.min(1, emotionalValence)).toFixed(2)),
    importance: Number(Math.max(0, Math.min(1, importance)).toFixed(2)),
    decayWeight: 1,
  };

  list.unshift(record);
  memoriesByAgent.set(agentId, list);
  return record;
}

/**
 * Consolidates high-importance short-term memories to long-term storage,
 * decays older entries, and keeps per-agent memory buffers bounded.
 */
export function maintainAgentMemories(
  memoriesByAgent: Map<string, MemoryRecord[]>,
): void {
  for (const [agentId, list] of memoriesByAgent.entries()) {
    const shortTerm: MemoryRecord[] = [];
    const longTerm: MemoryRecord[] = [];

    for (const mem of list) {
      if (mem.tier === 'short_term') {
        mem.decayWeight = Number(Math.max(0.05, mem.decayWeight * 0.88).toFixed(2));
        if (mem.importance >= 0.68) {
          mem.tier = 'long_term';
          longTerm.push(mem);
        } else if (mem.decayWeight >= 0.18) {
          shortTerm.push(mem);
        }
      } else {
        mem.decayWeight = Number(Math.max(0.25, mem.decayWeight * 0.985).toFixed(2));
        longTerm.push(mem);
      }
    }

    const trimmed = [
      ...shortTerm.slice(0, MAX_SHORT_TERM_PER_AGENT),
      ...longTerm
        .sort((a, b) => b.importance * b.decayWeight - a.importance * a.decayWeight)
        .slice(0, MAX_LONG_TERM_PER_AGENT),
    ];
    memoriesByAgent.set(agentId, trimmed);
  }
}
