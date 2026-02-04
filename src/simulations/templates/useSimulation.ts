/**
 * useSimulation Hook
 * Generic hook for running any simulation with the framework
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../../core/stores';
import type { BaseSimulation } from './BaseSimulation';
import type { PhysicsState, EnergyState, TrailPoint } from '../../core/types';

interface UseSimulationOptions {
  autoStart?: boolean;
  recordTrails?: boolean;
  recordPhaseSpace?: boolean;
}

interface UseSimulationReturn {
  physicsState: PhysicsState | null;
  energy: EnergyState;
  reset: () => void;
  updateParams: (params: Record<string, unknown>) => void;
}

export function useSimulation(
  SimulationClass: new () => BaseSimulation,
  initialParams: Record<string, unknown>,
  options: UseSimulationOptions = {}
): UseSimulationReturn {
  const { autoStart = false, recordTrails = true, recordPhaseSpace = true } = options;

  const simulationRef = useRef<BaseSimulation | null>(null);
  const [physicsState, setPhysicsState] = useState<PhysicsState | null>(null);
  const [energy, setEnergy] = useState<EnergyState>({ kinetic: 0, potential: 0, total: 0 });
  const lastParamsRef = useRef<string>('');

  const {
    isPlaying,
    speed,
    addTrailPoints,
    addPhasePoints,
    setPhysicsState: setStorePhysicsState,
    setEnergy: setStoreEnergy,
    play,
    clearTrails,
    tick,
  } = useSimulationStore();

  // Initialize simulation
  useEffect(() => {
    const sim = new SimulationClass();
    sim.init(initialParams);
    simulationRef.current = sim;

    const state = sim.step(0);
    setPhysicsState(state);
    setEnergy(sim.getEnergy());

    if (autoStart) {
      play();
    }

    return () => {
      simulationRef.current = null;
    };
  }, [SimulationClass]);

  // Handle param changes
  useEffect(() => {
    const paramsString = JSON.stringify(initialParams);
    if (paramsString !== lastParamsRef.current && simulationRef.current) {
      lastParamsRef.current = paramsString;
      simulationRef.current.init(initialParams);
      clearTrails();

      const state = simulationRef.current.step(0);
      setPhysicsState(state);
      setEnergy(simulationRef.current.getEnergy());
    }
  }, [initialParams, clearTrails]);

  // Physics update loop
  useFrame((_, delta) => {
    // Update store's frame counter for throttling
    tick(delta);

    if (!isPlaying || !simulationRef.current) return;

    const sim = simulationRef.current;
    const dt = Math.min(delta, 0.05) * speed; // Cap delta to prevent instability
    const fixedDt = sim.config.physics.fixedTimestep;

    // Use fixed timestep for stability
    const steps = Math.ceil(dt / fixedDt);
    let state: PhysicsState | null = null;

    for (let i = 0; i < steps; i++) {
      state = sim.step(fixedDt);
    }

    if (state) {
      setPhysicsState(state);
      setStorePhysicsState(state);

      const currentEnergy = sim.getEnergy();
      setEnergy(currentEnergy);
      setStoreEnergy(currentEnergy);

      // Record trail points
      // Note: store handles throttling internally, so we create objects only when needed
      if (recordTrails) {
        const positions = state.positions;
        // Must create new objects since store keeps references
        const trailPoints: TrailPoint[] = positions.map((pos) => ({
          position: pos,
          time: state.time,
          energy: currentEnergy.total,
        }));
        addTrailPoints(trailPoints);
      }

      // Record phase space (store handles throttling)
      if (recordPhaseSpace && sim.getPhaseSpace) {
        const phasePoints = sim.getPhaseSpace();
        addPhasePoints(phasePoints);
      }
    }
  });

  // Reset function
  const reset = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.reset();
      clearTrails();
      const state = simulationRef.current.step(0);
      setPhysicsState(state);
      setEnergy(simulationRef.current.getEnergy());
    }
  }, [clearTrails]);

  // Update params function
  const updateParams = useCallback((params: Record<string, unknown>) => {
    if (simulationRef.current) {
      simulationRef.current.init(params);
      clearTrails();
      const state = simulationRef.current.step(0);
      setPhysicsState(state);
      setEnergy(simulationRef.current.getEnergy());
    }
  }, [clearTrails]);

  return {
    physicsState,
    energy,
    reset,
    updateParams,
  };
}
