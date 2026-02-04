/**
 * NPendulumScene
 * Complete scene for the N-pendulum chain simulation
 */

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useControls, button } from 'leva';
import {
  SimulationCanvas,
  EnergyGraph,
  SimulationInfo,
} from '../../core/components';
import { useSimulationStore, useThemeStore } from '../../core/stores';
import { useSimulation } from '../templates';
import { NPendulum } from './NPendulum';
import { PendulumRenderer } from './PendulumRenderer';
import { exportToCSV } from '../../utils';
import { themes } from '../../core/types';
import type { EnergyState } from '../../core/types';

interface SimulationRunnerProps {
  params: Record<string, unknown>;
  onEnergyUpdate: (energy: EnergyState) => void;
  onReset: () => void;
}

function SimulationRunner({ params, onEnergyUpdate, onReset }: SimulationRunnerProps) {
  const { physicsState, energy, reset } = useSimulation(
    NPendulum,
    params,
    { autoStart: false, recordTrails: true, recordPhaseSpace: false }
  );

  useEffect(() => {
    onEnergyUpdate(energy);
  }, [energy, onEnergyUpdate]);

  useEffect(() => {
    (window as unknown as { __simReset?: () => void }).__simReset = () => {
      reset();
      onReset();
    };
    return () => {
      delete (window as unknown as { __simReset?: () => void }).__simReset;
    };
  }, [reset, onReset]);

  return (
    <PendulumRenderer
      state={physicsState}
      pivotPosition={{ x: 0, y: 0, z: 0 }}
      massRadius={0.12}
      rodRadius={0.03}
    />
  );
}

export function NPendulumScene() {
  // Simulation parameters
  const simParams = useControls('Pendulum Chain', {
    n: { value: 5, min: 2, max: 10, step: 1, label: 'Number of Segments', hint: 'Number of pendulum segments in the chain (2-10)' },
    segmentLength: { value: 0.6, min: 0.1, max: 2, step: 0.1, label: 'Segment Length', hint: 'Length of each segment in meters' },
    segmentMass: { value: 1, min: 0.1, max: 5, step: 0.1, label: 'Segment Mass', hint: 'Mass of each pendulum bob in kilograms' },
    gravity: { value: 9.81, min: 0.1, max: 25, step: 0.1, label: 'Gravity', hint: 'Gravitational acceleration (Earth: 9.81, Moon: 1.62)' },
    damping: { value: 0.005, min: 0, max: 0.1, step: 0.001, label: 'Damping', hint: 'Energy dissipation per segment (small values recommended)' },
    initialSpread: { value: Math.PI / 4, min: 0, max: Math.PI, step: 0.01, label: 'Initial Spread', hint: 'Initial angle offset between segments (creates wave patterns)' },
  });

  // Playback
  const {
    isPlaying,
    speed,
    showTrails,
    showEnergy,
    showGrid,
    maxTrailLength,
    play,
    pause,
    reset: resetStore,
    setSpeed,
    setShowTrails,
    setShowEnergy,
    setShowGrid,
    setMaxTrailLength,
    clearTrails,
  } = useSimulationStore();

  useControls('Playback', {
    playing: { value: isPlaying, onChange: (v) => (v ? play() : pause()), hint: 'Start or pause the simulation' },
    speed: { value: speed, min: 0.1, max: 5, step: 0.1, onChange: setSpeed, hint: 'Simulation speed multiplier (1x = real-time)' },
  });

  useControls('Visualization', {
    trails: { value: showTrails, onChange: setShowTrails, hint: 'Show motion trails behind each mass in the chain' },
    trailLength: { value: maxTrailLength, min: 100, max: 2000, step: 100, onChange: setMaxTrailLength, hint: 'Maximum number of trail points per mass' },
    energy: { value: showEnergy, onChange: setShowEnergy, hint: 'Show real-time total energy graph' },
    grid: { value: showGrid, onChange: setShowGrid, hint: 'Show reference grid in the scene' },
    'Clear Trails': button(() => clearTrails()),
  });

  // Theme
  const { themeName, setTheme, setColorOverride, colors } = useThemeStore();

  useControls('Theme', {
    preset: { value: themeName, options: Object.keys(themes), onChange: setTheme, hint: 'Visual theme preset (dark, neon, scientific)' },
  });
  useControls('Colors', {
    mass: { value: colors.mass, onChange: (v: string) => setColorOverride('mass', v), hint: 'Color of all pendulum bob masses' },
    rod: { value: colors.rod, onChange: (v: string) => setColorOverride('rod', v), hint: 'Color of the pendulum chain segments' },
    trail: { value: colors.trail, onChange: (v: string) => setColorOverride('trail', v), hint: 'Color of the motion trails' },
  });

  // Energy history - limited to ~30 seconds of data to prevent memory buildup
  const MAX_ENERGY_HISTORY = 900;
  const [energyHistory, setEnergyHistory] = useState<EnergyState[]>([]);

  // Throttle energy updates to avoid creating new arrays every frame
  const lastEnergyUpdateRef = useRef<number>(0);
  const energyBufferRef = useRef<EnergyState[]>([]);
  const ENERGY_UPDATE_INTERVAL = 33; // ~30fps instead of 60fps

  const handleEnergyUpdate = useCallback((energy: EnergyState) => {
    if (energy.total > 0) {
      const now = performance.now();
      energyBufferRef.current.push(energy);

      if (now - lastEnergyUpdateRef.current >= ENERGY_UPDATE_INTERVAL) {
        lastEnergyUpdateRef.current = now;
        const buffered = energyBufferRef.current;
        energyBufferRef.current = [];

        setEnergyHistory((prev) => {
          const newLength = Math.min(prev.length + buffered.length, MAX_ENERGY_HISTORY);
          const startIdx = prev.length + buffered.length - newLength;
          const result = startIdx > 0
            ? [...prev.slice(startIdx), ...buffered]
            : [...prev, ...buffered];
          return result.length > MAX_ENERGY_HISTORY ? result.slice(-MAX_ENERGY_HISTORY) : result;
        });
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    resetStore();
    setEnergyHistory([]);
  }, [resetStore]);

  useControls('Export', {
    'Export CSV': button(() => {
      const sim = new NPendulum();
      sim.init(simParams);
      sim.enableRecording(true); // Enable history recording for export
      for (let i = 0; i < 1000; i++) sim.step(1 / 60);
      exportToCSV(sim.export(), 'n-pendulum-data.csv');
    }),
    Reset: button(() => {
      const resetFn = (window as unknown as { __simReset?: () => void }).__simReset;
      if (resetFn) resetFn();
    }),
  });

  // Memoize to avoid creating new NPendulum instance on every render
  const meta = useMemo(() => new NPendulum().config.meta, []);

  // Calculate camera distance based on chain length
  const totalLength = simParams.n * simParams.segmentLength;
  const cameraZ = Math.max(8, totalLength * 2);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SimulationCanvas
        cameraPosition={{ x: 0, y: 1, z: cameraZ }}
        cameraTarget={{ x: 0, y: -totalLength / 3, z: 0 }}
        enablePostProcessing={false} // DISABLED FOR MEMORY TEST
        lowPowerMode={true} // ENABLED FOR MEMORY TEST
      >
        <SimulationRunner
          params={simParams}
          onEnergyUpdate={handleEnergyUpdate}
          onReset={handleReset}
        />
      </SimulationCanvas>

      <SimulationInfo meta={meta} params={simParams} showParams={false} />

      {showEnergy && <EnergyGraph history={energyHistory} />}
    </div>
  );
}
