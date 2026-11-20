import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSimulation } from '../context/SimulationContext.tsx';
import type { CommunityId } from '../types/world.ts';

const COMMUNITY_X_OFFSET: Record<CommunityId, number> = {
  greenfield: 60,
  metrocore: 440,
  novadistrict: 820,
};

const COMMUNITY_BORDER: Record<CommunityId, string> = {
  greenfield: '#10b981',
  metrocore: '#06b6d4',
  novadistrict: '#8b5cf6',
};

export function SocialNetworkPage() {
  const { bundle, openAgentInspector } = useSimulation();
  const [minTrust, setMinTrust] = useState(0);
  const [communityFilter, setCommunityFilter] = useState<CommunityId | 'all'>('all');

  const { nodes, edges } = useMemo(() => {
    if (!bundle) return { nodes: [] as Node[], edges: [] as Edge[] };

    const visibleAgents = bundle.agents.filter(
      (a) => communityFilter === 'all' || a.state.currentCommunity === communityFilter,
    );
    const visibleIds = new Set(visibleAgents.map((a) => a.id));

    const countByCommunity: Record<CommunityId, number> = {
      greenfield: 0,
      metrocore: 0,
      novadistrict: 0,
    };

    const flowNodes: Node[] = visibleAgents.map((agent) => {
      const idx = countByCommunity[agent.state.currentCommunity]++;
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const baseX = COMMUNITY_X_OFFSET[agent.state.currentCommunity];

      return {
        id: agent.id,
        position: { x: baseX + col * 155, y: 40 + row * 95 },
        data: {
          label: `${agent.name} (${agent.currentRole})`,
        },
        style: {
          background: '#0F172A',
          color: '#F1F5F9',
          border: `1px solid ${COMMUNITY_BORDER[agent.state.currentCommunity]}`,
          borderRadius: '8px',
          fontSize: '11px',
          padding: '6px 8px',
          width: 142,
        },
      };
    });

    const flowEdges: Edge[] = bundle.relationships
      .filter(
        (rel) =>
          visibleIds.has(rel.agentA) &&
          visibleIds.has(rel.agentB) &&
          rel.trust >= minTrust,
      )
      .slice(0, 120)
      .map((rel) => {
        const isConflict = rel.trust < 0;
        const isHighTrust = rel.trust >= 0.4;
        return {
          id: rel.id,
          source: rel.agentA,
          target: rel.agentB,
          animated: rel.successfulTrades > 0,
          style: {
            stroke: isConflict ? '#f43f5e' : isHighTrust ? '#06b6d4' : '#475569',
            strokeWidth: isHighTrust ? 2 : 1,
            strokeDasharray: isConflict ? '4 4' : undefined,
          },
        };
      });

    return { nodes: flowNodes, edges: flowEdges };
  }, [bundle, minTrust, communityFilter]);

  if (!bundle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400">
        Building social network graph...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Emergent Social & Trade Network
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cyan links indicate high trust; animated edges show completed trades. Click any node to open the Agent Inspector.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            <span>Min Trust</span>
            <input
              type="range"
              min={-1}
              max={0.8}
              step={0.1}
              value={minTrust}
              onChange={(e) => setMinTrust(Number(e.target.value))}
              className="w-24 accent-cyan-400"
            />
            <span className="font-mono tabular-nums w-10">{minTrust.toFixed(1)}</span>
          </label>

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
        </div>
      </section>

      <div className="h-[560px] w-full rounded-xl border border-slate-800 bg-[#070B14] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_event, node) => openAgentInspector(node.id)}
          fitView
        >
          <Background color="#1e293b" gap={24} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
