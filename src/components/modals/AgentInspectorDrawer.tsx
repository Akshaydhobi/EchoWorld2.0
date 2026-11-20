import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchAgentDetails } from '../../services/api.ts';
import type { AgentComposite, MemoryRecord } from '../../types/simulation.ts';

interface AgentInspectorDrawerProps {
  agentId: string | null;
  liveAgentSnapshot?: AgentComposite;
  onClose: () => void;
}

export function AgentInspectorDrawer({
  agentId,
  liveAgentSnapshot,
  onClose,
}: AgentInspectorDrawerProps) {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    let active = true;
    setLoading(true);
    fetchAgentDetails(agentId)
      .then((res) => {
        if (!active) return;
        setMemories(res.memories);
      })
      .catch(() => {
        if (!active) return;
        setMemories([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId, liveAgentSnapshot?.state.tick]);

  if (!agentId || !liveAgentSnapshot) return null;

  const agent = liveAgentSnapshot;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <aside className="w-full max-w-xl bg-[#0B1220] border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs text-cyan-400 font-mono">
              {agent.agentCode} · {agent.currentRole} · {agent.state.currentCommunity}
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              {agent.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Algorithmic utility agent (non-sentient state machine)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Goals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3">
            <div className="text-slate-400">Short-Term Goal</div>
            <div className="text-slate-200 mt-1 leading-relaxed">{agent.shortTermGoal}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3">
            <div className="text-slate-400">Long-Term Goal</div>
            <div className="text-slate-200 mt-1 leading-relaxed">{agent.longTermGoal}</div>
          </div>
        </div>

        {/* Inventory (6 Resources) */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 mb-2">
            Resource Inventory (Zero Negative Balances)
          </h3>
          <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-xs">
            {(
              [
                ['Echo Credits', `${agent.state.inventory.money} EC`],
                ['Food', agent.state.inventory.food],
                ['Energy', agent.state.inventory.energy],
                ['Materials', agent.state.inventory.materials],
                ['Knowledge', agent.state.inventory.knowledge],
                ['Healthcare', agent.state.inventory.healthcare],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-[#0F172A] p-2.5">
                <div className="text-slate-500">{label}</div>
                <div className="text-sm font-semibold text-white mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Needs & Wellbeing */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400">Needs & Energy</h3>
            <span className="font-mono tabular-nums text-xs text-emerald-400">
              Wellbeing {agent.state.wellbeing}% · Energy {agent.state.energy}%
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(agent.state.needs).map(([need, val]) => (
              <div key={need} className="flex items-center gap-3 text-xs">
                <span className="w-20 capitalize text-slate-400">{need}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      val < 30 ? 'bg-rose-500' : val < 55 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono tabular-nums text-slate-300">
                  {Math.round(val)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Personality Parameters */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 mb-2">Personality Traits</h3>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(agent.personality).map(([trait, val]) => (
              <div key={trait} className="flex items-center gap-3 text-xs">
                <span className="w-28 capitalize text-slate-400">{trait}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${Math.round(val * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono tabular-nums text-slate-300">
                  {val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Private Memory Buffer */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400">
              Private Memories (Isolated from other agents)
            </h3>
            {loading && <span className="text-xs text-slate-500">Syncing...</span>}
          </div>
          {memories.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3 text-xs text-slate-500">
              No consolidated memories recorded yet. Step or run the simulation to accumulate experience.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-2 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-mono text-slate-500 mr-2">T{mem.tick}</span>
                    <span className="text-slate-200">{mem.summary}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-cyan-400 shrink-0">
                    {mem.tier === 'long_term' ? 'Long' : 'Short'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Decision History */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 mb-2">
            Recent Decision History
          </h3>
          {agent.state.decisionHistory.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3 text-xs text-slate-500">
              Awaiting first simulation tick.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {agent.state.decisionHistory.map((d, idx) => (
                <div
                  key={`${d.tick}-${idx}`}
                  className="rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                    <span className="text-cyan-400">
                      Tick {d.tick} · {d.actionType}
                    </span>
                    <span
                      className={
                        d.outcome === 'success'
                          ? 'text-emerald-400'
                          : d.outcome === 'blocked'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }
                    >
                      {d.outcome} · U={d.utilityScore}
                    </span>
                  </div>
                  <div className="text-slate-300 mt-1">{d.reason}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
