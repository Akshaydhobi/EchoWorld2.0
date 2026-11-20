import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSimulation } from '../context/SimulationContext.tsx';
import type { EventSource } from '../types/simulation.ts';

export function EventTimelinePage() {
  const { bundle } = useSimulation();
  const [sourceFilter, setSourceFilter] = useState<EventSource | 'all'>('all');

  if (!bundle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400">
        Loading event timeline...
      </div>
    );
  }

  const events = bundle.recentEvents.filter(
    (ev) => sourceFilter === 'all' || ev.source === sourceFilter,
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              Society Telemetry & Shock Response
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Track how food reserves, energy, and citizen wellbeing shift across world events.
            </p>
          </div>
          <span className="font-mono text-xs text-cyan-400">
            Active Shocks: {bundle.activeEvents.length}
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bundle.snapshots.slice(-80)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="tick" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1220',
                  borderColor: '#1e293b',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="avgWellbeing"
                name="Avg Wellbeing (%)"
                stroke="#10b981"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="totalResources.food"
                name="Total Food"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="totalResources.energy"
                name="Total Energy"
                stroke="#8b5cf6"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <h3 className="font-display text-lg font-semibold text-white">
            Chronological Event & Intervention Log
          </h3>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070B14] border border-slate-800">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'environment', label: 'Environment' },
                { id: 'architect_intervention', label: 'Architect' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  sourceFilter === tab.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {events.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              No events match the current filter.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-slate-800 bg-[#0B1220] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Tick {ev.tick} · {ev.source.replace('_', ' ')} · Target {ev.targetCommunity}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">{ev.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{ev.description}</div>
                </div>
                <div className="font-mono tabular-nums text-xs text-cyan-400 shrink-0">
                  Duration {ev.durationTicks} ticks
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
