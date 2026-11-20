import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AgentInspectorDrawer } from './components/modals/AgentInspectorDrawer.tsx';
import { SimulationProvider, useSimulation } from './context/SimulationContext.tsx';
import { AgentExplorerPage } from './pages/AgentExplorerPage.tsx';
import { EventTimelinePage } from './pages/EventTimelinePage.tsx';
import { ResearchLabPage } from './pages/ResearchLabPage.tsx';
import { SimulationControlPage } from './pages/SimulationControlPage.tsx';
import { SocialNetworkPage } from './pages/SocialNetworkPage.tsx';
import { WorldOverviewPage } from './pages/WorldOverviewPage.tsx';

type ScreenId =
  | 'overview'
  | 'agents'
  | 'network'
  | 'control'
  | 'events'
  | 'research';

const NAV_ITEMS: Array<{ id: ScreenId; label: string }> = [
  { id: 'overview', label: 'World Overview' },
  { id: 'agents', label: 'Agents' },
  { id: 'network', label: 'Social Network' },
  { id: 'control', label: 'Controls' },
  { id: 'events', label: 'Timeline' },
  { id: 'research', label: 'Research Lab' },
];

function EchoWorldShell() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview');
  const {
    bundle,
    health,
    error,
    clearError,
    inspectedAgentId,
    closeAgentInspector,
    start,
    pause,
  } = useSimulation();

  const inspectedAgent = bundle?.agents.find((a) => a.id === inspectedAgentId);
  const isRunning = bundle?.world.status === 'running';

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Three-Zone Top Bar Contract */}
      <header className="border-b border-slate-800/90 bg-[#070B14]/95 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveScreen('overview');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            EchoWorld
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  activeScreen === item.id
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={isRunning ? pause : start}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {isRunning ? 'Pause Simulation' : 'Start Simulation'}
            </button>
          </div>
        </div>

        {/* Mobile Secondary Screen Bar */}
        <div className="md:hidden border-t border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                activeScreen === item.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 bg-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            ECHOWORLD — A Society That Evolves Without a Script · Echo City ({bundle?.agents.length ?? 30} Autonomous Agents)
          </div>
          <div className="font-mono tabular-nums">
            Tick {String(bundle?.world.currentTick ?? 0).padStart(4, '0')} ·{' '}
            {bundle?.world.status ?? 'loading'} ·{' '}
            {health?.storageMode === 'mongodb' ? 'MongoDB' : 'In-Memory Store'}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center justify-between gap-4"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-rose-300 hover:text-white font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeScreen === 'overview' && <WorldOverviewPage />}
            {activeScreen === 'agents' && <AgentExplorerPage />}
            {activeScreen === 'network' && <SocialNetworkPage />}
            {activeScreen === 'control' && <SimulationControlPage />}
            {activeScreen === 'events' && <EventTimelinePage />}
            {activeScreen === 'research' && <ResearchLabPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>ECHOWORLD — Programmed Utility Autonomy · Fictional Credits (EC)</span>
          <span className="font-mono">Deterministic Seeded Engine · Zero Paid APIs</span>
        </div>
      </footer>

      <AgentInspectorDrawer
        agentId={inspectedAgentId}
        liveAgentSnapshot={inspectedAgent}
        onClose={closeAgentInspector}
      />
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <EchoWorldShell />
    </SimulationProvider>
  );
}
