import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EchoCityCanvas } from '../components/city3d/EchoCityCanvas.tsx';
import { formatBuildingType } from '../components/DistrictBlueprintMap.tsx';
import { useSimulation } from '../context/SimulationContext.tsx';
import type { Building } from '../types/world.ts';

export function WorldOverviewPage() {
  const { bundle, openAgentInspector, start, pause, step } = useSimulation();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  if (!bundle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400">
        Loading Echo City simulation state...
      </div>
    );
  }

  const { world, agents, latestSnapshot, snapshots, activeEvents } = bundle;
  const activeBuilding =
    selectedBuilding ?? world.communities[0]?.buildings[0] ?? null;

  const occupants = activeBuilding
    ? agents.filter((a) => a.state.currentBuildingId === activeBuilding.buildingId)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Primary Visual Anchor: Interactive 3D Echo City */}
      <EchoCityCanvas
        world={world}
        agents={agents}
        selectedBuildingId={activeBuilding?.buildingId ?? null}
        onSelectBuilding={setSelectedBuilding}
        onSelectAgent={openAgentInspector}
        onStart={start}
        onPause={pause}
        onStep={step}
      />

      {/* Selected Building Summary Bar */}
      {activeBuilding && (
        <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-cyan-400 font-medium">
              Selected Structure · {activeBuilding.communityId} ·{' '}
              {formatBuildingType(activeBuilding.type)}
            </div>
            <h2 className="font-display text-lg font-semibold text-white mt-0.5">
              {activeBuilding.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeBuilding.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono tabular-nums text-xs shrink-0">
            <div>
              <span className="text-slate-500 block">Present Agents</span>
              <span className="text-sm text-white font-semibold">
                {occupants.length} / {activeBuilding.capacity}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Condition</span>
              <span className="text-sm text-emerald-400 font-semibold">
                {activeBuilding.condition}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Active Shocks</span>
              <span className="text-sm text-amber-400 font-semibold">
                {activeEvents.length}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Society KPI Strip */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Population</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-white mt-1">
            {agents.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active agents</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Simulation Tick</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-cyan-400 mt-1">
            {world.currentTick}
          </div>
          <div className="text-xs text-slate-500 mt-1 capitalize">{world.status}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Avg Wellbeing</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-emerald-400 mt-1">
            {latestSnapshot?.avgWellbeing.toFixed(1) ?? '—'}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Needs composite</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Cooperation Rate</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-violet-400 mt-1">
            {((latestSnapshot?.cooperationRate ?? 0) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Joint actions</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Wealth Inequality</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-amber-400 mt-1">
            {latestSnapshot?.wealthGini.toFixed(3) ?? '0.000'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Gini coefficient</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-4">
          <div className="text-xs text-slate-400">Total Currency</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-white mt-1">
            {Math.round(latestSnapshot?.totalResources.money ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Echo Credits (EC)</div>
        </div>
      </section>

      {/* Community Statistics & Live Trajectory Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col gap-4">
          <h3 className="font-display text-base font-semibold text-white">
            Community Breakdown
          </h3>
          <div className="flex flex-col gap-3">
            {(latestSnapshot?.communityStats ?? []).map((comm) => (
              <div
                key={comm.communityId}
                className="rounded-lg border border-slate-800 bg-[#0B1220] px-4 py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{comm.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {comm.population} agents · Wellbeing {comm.avgWellbeing}%
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums text-sm text-cyan-400">
                  {Math.round(comm.totalWealthEC)} EC
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs text-slate-400 mb-2">Total Resource Reserves</div>
            <div className="grid grid-cols-5 gap-2 font-mono tabular-nums text-xs">
              {(
                [
                  ['Food', latestSnapshot?.totalResources.food ?? 0],
                  ['Energy', latestSnapshot?.totalResources.energy ?? 0],
                  ['Materials', latestSnapshot?.totalResources.materials ?? 0],
                  ['Knowledge', latestSnapshot?.totalResources.knowledge ?? 0],
                  ['Health', latestSnapshot?.totalResources.healthcare ?? 0],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="rounded-md bg-[#0B1220] border border-slate-800 p-2">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className="text-slate-200 font-semibold mt-0.5">{Math.round(val)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-white">
              Civilization Wellbeing & Cooperation Trajectory
            </h3>
            <span className="font-mono text-xs text-slate-400">
              {snapshots.length} recorded ticks
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshots.slice(-60)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tick" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1220',
                    borderColor: '#1e293b',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgWellbeing"
                  name="Avg Wellbeing (%)"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey={(d) => Math.round(d.cooperationRate * 100)}
                  name="Cooperation (%)"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
