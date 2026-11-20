import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext.tsx';
import type { AgentRole } from '../types/simulation.ts';
import type { CommunityId } from '../types/world.ts';

export function AgentExplorerPage() {
  const { bundle, openAgentInspector } = useSimulation();
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState<CommunityId | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<AgentRole | 'all'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'wellbeing' | 'money'>('code');

  const filteredAgents = useMemo(() => {
    if (!bundle) return [];
    return bundle.agents
      .filter((a) => {
        if (communityFilter !== 'all' && a.state.currentCommunity !== communityFilter) {
          return false;
        }
        if (roleFilter !== 'all' && a.currentRole !== roleFilter) {
          return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return (
            a.name.toLowerCase().includes(q) ||
            a.agentCode.toLowerCase().includes(q) ||
            a.currentRole.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'wellbeing') return b.state.wellbeing - a.state.wellbeing;
        if (sortBy === 'money') return b.state.inventory.money - a.state.inventory.money;
        return a.agentCode.localeCompare(b.agentCode);
      });
  }, [bundle, search, communityFilter, roleFilter, sortBy]);

  if (!bundle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400">
        Loading 30 autonomous agents...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Autonomous Agent Roster ({filteredAgents.length} / {bundle.agents.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inspect any agent to view private memories, personality traits, needs, and utility-scored decision logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={communityFilter}
            onChange={(e) => setCommunityFilter(e.target.value as CommunityId | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
          >
            <option value="all">All Communities</option>
            <option value="greenfield">Greenfield</option>
            <option value="metrocore">MetroCore</option>
            <option value="novadistrict">NovaDistrict</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as AgentRole | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
          >
            <option value="all">All Roles</option>
            <option value="entrepreneur">Entrepreneur</option>
            <option value="farmer">Farmer</option>
            <option value="engineer">Engineer</option>
            <option value="researcher">Researcher</option>
            <option value="trader">Trader</option>
            <option value="healthcare">Healthcare</option>
            <option value="teacher">Teacher</option>
            <option value="citizen">Citizen</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'code' | 'wellbeing' | 'money')}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
          >
            <option value="code">Sort: ID</option>
            <option value="wellbeing">Sort: Wellbeing</option>
            <option value="money">Sort: Echo Credits</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-3 px-4 font-medium">Agent</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium">Community</th>
              <th className="py-3 px-4 font-medium text-right">Wellbeing</th>
              <th className="py-3 px-4 font-medium text-right">Credits</th>
              <th className="py-3 px-4 font-medium text-right">Food</th>
              <th className="py-3 px-4 font-medium">Last Decision</th>
              <th className="py-3 px-4 font-medium text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filteredAgents.map((agent) => (
              <tr
                key={agent.id}
                className="hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="font-medium text-white">{agent.name}</div>
                  <div className="font-mono text-[11px] text-slate-500">{agent.agentCode}</div>
                </td>
                <td className="py-3 px-4 capitalize text-slate-300">{agent.currentRole}</td>
                <td className="py-3 px-4 capitalize text-cyan-400">
                  {agent.state.currentCommunity}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  <span
                    className={
                      agent.state.wellbeing >= 65
                        ? 'text-emerald-400'
                        : agent.state.wellbeing >= 45
                          ? 'text-amber-400'
                          : 'text-rose-400'
                    }
                  >
                    {agent.state.wellbeing.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-white">
                  {agent.state.inventory.money.toFixed(0)} EC
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                  {agent.state.inventory.food.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                  {agent.state.lastAction
                    ? `${agent.state.lastAction.actionType} (${agent.state.lastAction.outcome})`
                    : 'Initialized'}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => openAgentInspector(agent.id)}
                    className="px-3 py-1.5 rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors font-medium whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
