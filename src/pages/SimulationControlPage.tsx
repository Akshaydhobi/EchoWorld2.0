import { useState } from 'react';
import { Pause, Play, RefreshCw, StepForward, Zap } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext.tsx';
import type { WorldEventType } from '../types/simulation.ts';
import type { CommunityId, WorldRules } from '../types/world.ts';

const EVENT_OPTIONS: Array<{ type: WorldEventType; label: string }> = [
  { type: 'weather_disruption', label: 'Weather Disruption (Food Yield -40%)' },
  { type: 'energy_shortage', label: 'Energy Shortage (Grid Output -45%)' },
  { type: 'resource_scarcity', label: 'Resource Scarcity (Materials -45%)' },
  { type: 'market_shift', label: 'Market Demand Surge (Prices +25%)' },
  { type: 'tech_discovery', label: 'Technology Discovery (Knowledge +45%)' },
  { type: 'business_opportunity', label: 'Business Opportunity Cycle' },
  { type: 'infrastructure_fault', label: 'Infrastructure Fault' },
];

export function SimulationControlPage() {
  const {
    bundle,
    busyAction,
    start,
    pause,
    step,
    reset,
    setSpeed,
    updateRules,
    injectEvent,
  } = useSimulation();

  const [seedInput, setSeedInput] = useState(String(bundle?.world.seed ?? 2026));
  const [eventType, setEventType] = useState<WorldEventType>('weather_disruption');
  const [eventTarget, setEventTarget] = useState<CommunityId | 'all'>('all');

  if (!bundle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-12 text-center text-slate-400">
        Loading Architect control deck...
      </div>
    );
  }

  const { world } = bundle;

  return (
    <div className="flex flex-col gap-6">
      {/* Execution & Speed Deck */}
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Simulation Execution Control
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Current Tick <span className="font-mono text-cyan-400">{world.currentTick}</span> ·
            Status <span className="capitalize text-white">{world.status}</span> · Seed{' '}
            <span className="font-mono text-slate-200">#{world.seed}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {world.status === 'running' ? (
            <button
              type="button"
              onClick={pause}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400"
            >
              <Play className="w-4 h-4" />
              {world.status === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}

          <button
            type="button"
            onClick={step}
            disabled={busyAction === 'step'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-[#0B1220] text-slate-200 hover:bg-slate-800 text-xs font-semibold"
          >
            <StepForward className="w-4 h-4" />
            Step +1 Tick
          </button>

          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-800 bg-[#070B14]">
            {[
              { label: '0.5x', ms: 2000 },
              { label: '1x', ms: 1000 },
              { label: '2x', ms: 500 },
              { label: '5x', ms: 200 },
            ].map((spd) => (
              <button
                key={spd.label}
                type="button"
                onClick={() => setSpeed(spd.ms)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                  world.tickIntervalMs === spd.ms
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={2147483647}
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              className="w-24 px-2.5 py-2 rounded-lg border border-slate-700 bg-[#070B14] font-mono tabular-nums text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                const parsed = Number(seedInput);
                if (Number.isInteger(parsed) && parsed >= 1) void reset(parsed);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset World
            </button>
          </div>
        </div>
      </section>

      {/* Architect Rule Matrix */}
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-6 flex flex-col gap-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Permitted World Rules (Logged as Architect Interventions)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Adjust society constraints live without scripting individual agent behavior.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              {
                key: 'allowMigration',
                label: 'Allow Inter-Community Migration',
                desc: 'Agents can relocate across Greenfield, MetroCore, and NovaDistrict.',
              },
              {
                key: 'allowRoleChange',
                label: 'Allow Adaptive Role Switching',
                desc: 'Agents can shift occupations when market scarcity shifts incentives.',
              },
              {
                key: 'memoryEnabled',
                label: 'Enable Private Agent Memory',
                desc: 'Toggle short-term & long-term memory influence on utility decisions.',
              },
              {
                key: 'randomEventsEnabled',
                label: 'Organic Environmental Events',
                desc: 'Allow the environment to trigger stochastic shocks and discoveries.',
              },
            ] as Array<{ key: keyof WorldRules; label: string; desc: string }>
          ).map((item) => {
            const enabled = Boolean(world.rules[item.key]);
            return (
              <div
                key={item.key}
                className="rounded-lg border border-slate-800 bg-[#0B1220] p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateRules({ [item.key]: !enabled })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-800 bg-[#0B1220] p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Coordination Mode</div>
              <div className="text-xs text-slate-400 mt-1">
                Decentralized utility vs. centralized civic priority boost.
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              {(['decentralized', 'centralized'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateRules({ coordinationMode: mode })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                    world.rules.coordinationMode === mode
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0B1220] p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Trade Tax Rate</div>
              <div className="text-xs text-slate-400 mt-1">
                Civic levy deducted on resource trades (0% – 50%).
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.02}
                value={world.rules.taxRate}
                onChange={(e) => updateRules({ taxRate: Number(e.target.value) })}
                className="w-28 accent-violet-500"
              />
              <span className="font-mono tabular-nums text-sm text-white w-12 text-right">
                {(world.rules.taxRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Environmental Event Injector */}
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Inject World Event
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Introduce an external environmental shock or discovery and observe how Echo City adapts.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as WorldEventType)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
            >
              {EVENT_OPTIONS.map((ev) => (
                <option key={ev.type} value={ev.type}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Target District</label>
            <select
              value={eventTarget}
              onChange={(e) => setEventTarget(e.target.value as CommunityId | 'all')}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
            >
              <option value="all">All Echo City</option>
              <option value="greenfield">Greenfield</option>
              <option value="metrocore">MetroCore</option>
              <option value="novadistrict">NovaDistrict</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => injectEvent(eventType, eventTarget)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            Trigger Event
          </button>
        </div>
      </section>
    </div>
  );
}
