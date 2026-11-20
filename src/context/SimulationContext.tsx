import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  fetchHealth,
  fetchSimulationBundle,
  patchWorldRules,
  pauseSimulation,
  resetSimulation,
  startSimulation,
  stepSimulation,
  triggerWorldEvent,
  updateSimulationSpeed,
} from '../services/api.ts';
import { getSimSocket } from '../services/socket.ts';
import type { FullSimulationBundle, WorldEventType } from '../types/simulation.ts';
import type { CommunityId, WorldHealth, WorldRules } from '../types/world.ts';

interface SimulationContextValue {
  bundle: FullSimulationBundle | null;
  health: WorldHealth | null;
  socketConnected: boolean;
  busyAction: string | null;
  error: string | null;
  clearError: () => void;
  inspectedAgentId: string | null;
  openAgentInspector: (agentId: string) => void;
  closeAgentInspector: () => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  step: () => Promise<void>;
  reset: (seed: number) => Promise<void>;
  setSpeed: (tickIntervalMs: number) => Promise<void>;
  updateRules: (rules: Partial<WorldRules>) => Promise<void>;
  injectEvent: (type: WorldEventType, targetCommunity: CommunityId | 'all') => Promise<void>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<FullSimulationBundle | null>(null);
  const [health, setHealth] = useState<WorldHealth | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [initialBundle, healthInfo] = await Promise.all([
          fetchSimulationBundle(),
          fetchHealth(),
        ]);
        if (!active) return;
        setBundle(initialBundle);
        setHealth(healthInfo);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to EchoWorld server.');
      }
    }

    void load();

    const socket = getSimSocket();
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onBundle = (nextBundle: FullSimulationBundle) => {
      setBundle(nextBundle);
    };

    setSocketConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sim:bundle', onBundle);

    return () => {
      active = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sim:bundle', onBundle);
    };
  }, []);

  async function runAction(label: string, fn: () => Promise<FullSimulationBundle>) {
    setError(null);
    setBusyAction(label);
    try {
      const next = await fn();
      setBundle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Action '${label}' failed.`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SimulationContext.Provider
      value={{
        bundle,
        health,
        socketConnected,
        busyAction,
        error,
        clearError: () => setError(null),
        inspectedAgentId,
        openAgentInspector: (id) => setInspectedAgentId(id),
        closeAgentInspector: () => setInspectedAgentId(null),
        start: () => runAction('start', startSimulation),
        pause: () => runAction('pause', pauseSimulation),
        step: () => runAction('step', stepSimulation),
        reset: (seed) => runAction('reset', () => resetSimulation(seed)),
        setSpeed: (ms) => runAction('speed', () => updateSimulationSpeed(ms)),
        updateRules: async (rules) => {
          setError(null);
          setBusyAction('rules');
          try {
            await patchWorldRules(rules);
            const next = await fetchSimulationBundle();
            setBundle(next);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update rules.');
          } finally {
            setBusyAction(null);
          }
        },
        injectEvent: (type, targetCommunity) =>
          runAction('event', () => triggerWorldEvent({ type, targetCommunity })),
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used inside SimulationProvider.');
  }
  return ctx;
}
