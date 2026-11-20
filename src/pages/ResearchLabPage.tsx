import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchExperiments, runExperiment } from '../services/api.ts';
import type { ExperimentRecord, ResearchQuestionId } from '../types/simulation.ts';

const QUESTIONS: Array<{ id: ResearchQuestionId; label: string }> = [
  { id: 'memory_vs_nomemory', label: 'Memory-Enabled vs. Memory-Disabled Agents' },
  { id: 'cooperation_vs_independence', label: 'Cooperation vs. Independence' },
  { id: 'resource_scarcity', label: 'Abundance vs. Resource Scarcity' },
  { id: 'personality_diversity', label: 'Personality Diversity vs. Uniformity' },
  { id: 'centralized_vs_decentralized', label: 'Centralized vs. Decentralized Coordination' },
  { id: 'event_adaptability', label: 'Adaptability to Environmental Shocks' },
];

export function ResearchLabPage() {
  const [question, setQuestion] = useState<ResearchQuestionId>('memory_vs_nomemory');
  const [ticksToRun, setTicksToRun] = useState(40);
  const [seedsText, setSeedsText] = useState('101, 202, 303');
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [activeExp, setActiveExp] = useState<ExperimentRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments()
      .then((list) => {
        setExperiments(list);
        if (list.length > 0) setActiveExp(list[0]);
      })
      .catch(() => {});
  }, []);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedSeeds = seedsText
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1);

    if (parsedSeeds.length === 0) {
      setError('Enter one or more comma-separated integer seeds (e.g., 101, 202, 303).');
      return;
    }

    setRunning(true);
    try {
      const exp = await runExperiment({
        researchQuestion: question,
        ticksToRun,
        seeds: parsedSeeds,
      });
      setExperiments((prev) => [exp, ...prev]);
      setActiveExp(exp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Experiment execution failed.');
    } finally {
      setRunning(false);
    }
  }

  // Aggregate per-variant mean metrics across all seeds
  const variantSummary = useMemo(() => {
    if (!activeExp) return [];
    const grouped = new Map<string, typeof activeExp.results>();
    for (const r of activeExp.results) {
      const arr = grouped.get(r.variantLabel) ?? [];
      arr.push(r);
      grouped.set(r.variantLabel, arr);
    }

    return Array.from(grouped.entries()).map(([label, runs]) => {
      const n = runs.length;
      const avg = (fn: (r: (typeof runs)[number]) => number) =>
        Number((runs.reduce((s, r) => s + fn(r), 0) / n).toFixed(3));
      const recoveryRuns = runs.filter((r) => r.recoveryTicks !== null);
      const meanRecovery =
        recoveryRuns.length > 0
          ? Number(
              (
                recoveryRuns.reduce((s, r) => s + (r.recoveryTicks ?? 0), 0) /
                recoveryRuns.length
              ).toFixed(1),
            )
          : null;

      return {
        label,
        seedsCount: n,
        wellbeing: avg((r) => r.finalAvgWellbeing),
        cooperationPct: Number((avg((r) => r.meanCooperationRate) * 100).toFixed(1)),
        gini: avg((r) => r.finalWealthGini),
        decisionSuccessPct: Number((avg((r) => r.decisionSuccessRate) * 100).toFixed(1)),
        recoveryTicks: meanRecovery,
        totalFood: avg((r) => r.resourceTotals.food),
      };
    });
  }, [activeExp]);

  // Build comparative tick series for the first seed across variants
  const comparisonSeries = useMemo(() => {
    if (!activeExp || activeExp.variants.length < 2) return [];
    const firstSeed = activeExp.seeds[0];
    const runA = activeExp.results.find(
      (r) => r.variantLabel === activeExp.variants[0].label && r.seed === firstSeed,
    );
    const runB = activeExp.results.find(
      (r) => r.variantLabel === activeExp.variants[1].label && r.seed === firstSeed,
    );
    if (!runA || !runB) return [];

    return runA.timeSeries.map((pt, idx) => ({
      tick: pt.tick,
      wellbeingA: pt.avgWellbeing,
      wellbeingB: runB.timeSeries[idx]?.avgWellbeing ?? 0,
      coopA: Math.round(pt.cooperationRate * 100),
      coopB: Math.round((runB.timeSeries[idx]?.cooperationRate ?? 0) * 100),
    }));
  }, [activeExp]);

  return (
    <div className="flex flex-col gap-6">
      {/* Experiment Configuration Form */}
      <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-violet-400" />
              Empirical Research Laboratory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Run isolated multi-seed A/B experiments. Results display actual measured outcomes without assuming hypotheses.
            </p>
          </div>
        </div>

        <form onSubmit={handleRun} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Research Question</label>
            <select
              value={question}
              onChange={(e) => setQuestion(e.target.value as ResearchQuestionId)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] text-xs text-white"
            >
              {QUESTIONS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Ticks per Trial (10–300)
            </label>
            <input
              type="number"
              min={10}
              max={300}
              value={ticksToRun}
              onChange={(e) => setTicksToRun(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] font-mono tabular-nums text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Random Seeds (comma-separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seedsText}
                onChange={(e) => setSeedsText(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-700 bg-[#070B14] font-mono text-xs text-white"
              />
              <button
                type="submit"
                disabled={running}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                {running ? 'Running...' : 'Run Trial'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}
      </section>

      {activeExp && (
        <>
          {/* Measured Variant Comparison Table */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-white">
                Measured Outcomes: {activeExp.name}
              </h3>
              <span className="font-mono text-xs text-slate-400">
                Seeds [{activeExp.seeds.join(', ')}] · {activeExp.ticksToRun} ticks
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Experimental Variant</th>
                  <th className="py-2.5 px-3 text-right">Final Wellbeing</th>
                  <th className="py-2.5 px-3 text-right">Cooperation Rate</th>
                  <th className="py-2.5 px-3 text-right">Wealth Gini</th>
                  <th className="py-2.5 px-3 text-right">Decision Success</th>
                  <th className="py-2.5 px-3 text-right">Food Reserve</th>
                  <th className="py-2.5 px-3 text-right">Recovery Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {variantSummary.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 px-3 font-sans font-medium text-white">
                      {row.label}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      {row.wellbeing}%
                    </td>
                    <td className="py-3 px-3 text-right text-violet-400">
                      {row.cooperationPct}%
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400">{row.gini}</td>
                    <td className="py-3 px-3 text-right text-cyan-400">
                      {row.decisionSuccessPct}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">{row.totalFood}</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {row.recoveryTicks !== null ? `${row.recoveryTicks} ticks` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Comparative Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5">
              <h4 className="font-display text-base font-semibold text-white mb-4">
                Wellbeing Trajectory (Seed #{activeExp.seeds[0]})
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonSeries}>
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
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="wellbeingA"
                      name={activeExp.variants[0]?.label ?? 'Variant A'}
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="wellbeingB"
                      name={activeExp.variants[1]?.label ?? 'Variant B'}
                      stroke="#8b5cf6"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5">
              <h4 className="font-display text-base font-semibold text-white mb-4">
                Mean Variant Comparison (Across All Seeds)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={variantSummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0B1220',
                        borderColor: '#1e293b',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="wellbeing" name="Wellbeing (%)" fill="#10b981" />
                    <Bar dataKey="cooperationPct" name="Cooperation (%)" fill="#8b5cf6" />
                    <Bar dataKey="decisionSuccessPct" name="Success (%)" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}

      {experiments.length > 1 && (
        <section className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5">
          <h4 className="font-display text-sm font-semibold text-slate-300 mb-3">
            Saved Experiment History
          </h4>
          <div className="flex flex-wrap gap-2">
            {experiments.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => setActiveExp(exp)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  activeExp?.id === exp.id
                    ? 'border-cyan-400 bg-cyan-500/10 text-white'
                    : 'border-slate-800 bg-[#0B1220] text-slate-400 hover:text-white'
                }`}
              >
                {exp.name} ({exp.seeds.length} seeds)
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
