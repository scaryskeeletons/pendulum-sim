/**
 * DoublePendulumScene
 * Complete scene for the double pendulum simulation
 */

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useControls, button } from 'leva';
import {
  SimulationCanvas,
  EnergyGraph,
  PhaseSpaceView,
  SimulationInfo,
} from '../../core/components';
import { useSimulationStore, useThemeStore } from '../../core/stores';
import { useSimulation } from '../templates';
import { DoublePendulum } from './DoublePendulum';
import { PendulumRenderer } from './PendulumRenderer';
import { exportToCSV, exportToJSON } from '../../utils';
import { themes } from '../../core/types';
import type { EnergyState } from '../../core/types';

interface SimulationRunnerProps {
  params: Record<string, unknown>;
  onEnergyUpdate: (energy: EnergyState) => void;
  onReset: () => void;
}

// This component runs inside Canvas
function SimulationRunner({ params, onEnergyUpdate, onReset }: SimulationRunnerProps) {
  const { physicsState, energy, reset } = useSimulation(
    DoublePendulum,
    params,
    { autoStart: false, recordTrails: true, recordPhaseSpace: true }
  );

  // Notify parent of energy updates
  useEffect(() => {
    onEnergyUpdate(energy);
  }, [energy, onEnergyUpdate]);

  // Expose reset via callback
  useEffect(() => {
    // Store reset function so parent can call it
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
      massRadius={0.18}
      rodRadius={0.04}
    />
  );
}

export function DoublePendulumScene() {
  // Simulation parameters from Leva controls
  const simParams = useControls('Pendulum Parameters', {
    length1: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Length 1', hint: 'Length of the upper pendulum arm in meters' },
    length2: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Length 2', hint: 'Length of the lower pendulum arm in meters' },
    mass1: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass 1', hint: 'Mass of the upper bob in kilograms' },
    mass2: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass 2', hint: 'Mass of the lower bob in kilograms' },
    gravity: { value: 9.81, min: 0.1, max: 25, step: 0.1, label: 'Gravity', hint: 'Gravitational acceleration (Earth: 9.81, Moon: 1.62)' },
    damping: { value: 0, min: 0, max: 0.5, step: 0.01, label: 'Damping', hint: 'Energy dissipation coefficient (0 = no friction)' },
    initialAngle1: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.01, label: 'θ₁', hint: 'Initial angle of upper pendulum (radians from vertical)' },
    initialAngle2: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.01, label: 'θ₂', hint: 'Initial angle of lower pendulum (radians from vertical)' },
    initialVelocity1: { value: 0, min: -10, max: 10, step: 0.1, label: 'ω₁', hint: 'Initial angular velocity of upper pendulum (rad/s)' },
    initialVelocity2: { value: 0, min: -10, max: 10, step: 0.1, label: 'ω₂', hint: 'Initial angular velocity of lower pendulum (rad/s)' },
  });

  // Playback controls
  const {
    isPlaying,
    speed,
    showTrails,
    showEnergy,
    showPhaseSpace,
    showGrid,
    maxTrailLength,
    play,
    pause,
    reset: resetStore,
    setSpeed,
    setShowTrails,
    setShowEnergy,
    setShowPhaseSpace,
    setShowGrid,
    setMaxTrailLength,
    clearTrails,
  } = useSimulationStore();

  useControls('Playback', {
    playing: { value: isPlaying, onChange: (v) => (v ? play() : pause()), hint: 'Start or pause the simulation' },
    speed: { value: speed, min: 0.1, max: 5, step: 0.1, onChange: setSpeed, hint: 'Simulation speed multiplier (1x = real-time)' },
  });

  useControls('Visualization', {
    trails: { value: showTrails, onChange: setShowTrails, hint: 'Show motion trails behind each mass' },
    trailLength: { value: maxTrailLength, min: 100, max: 2000, step: 100, onChange: setMaxTrailLength, hint: 'Maximum number of trail points to display' },
    energy: { value: showEnergy, onChange: setShowEnergy, hint: 'Show real-time energy graph (KE, PE, Total)' },
    phaseSpace: { value: showPhaseSpace, onChange: setShowPhaseSpace, hint: 'Show phase space diagram (angle vs angular velocity)' },
    grid: { value: showGrid, onChange: setShowGrid, hint: 'Show reference grid in the scene' },
    'Clear Trails': button(() => clearTrails()),
  });

  // Theme controls
  const { themeName, setTheme, setColorOverride, colors } = useThemeStore();

  useControls('Theme', {
    preset: {
      value: themeName,
      options: Object.keys(themes),
      onChange: setTheme,
      hint: 'Visual theme preset (dark, neon, scientific)',
    },
  });
  useControls('Colors', {
    mass: { value: colors.mass, onChange: (v: string) => setColorOverride('mass', v), hint: 'Color of the pendulum bob masses' },
    rod: { value: colors.rod, onChange: (v: string) => setColorOverride('rod', v), hint: 'Color of the pendulum rods/arms' },
    trail: { value: colors.trail, onChange: (v: string) => setColorOverride('trail', v), hint: 'Color of the motion trail' },
  });

  // Energy history for graph - limited to ~30 seconds of data at 60fps
  const MAX_ENERGY_HISTORY = 900; // ~30 seconds at 30 samples/sec
  const [energyHistory, setEnergyHistory] = useState<EnergyState[]>([]);
  const { phaseSpace } = useSimulationStore();

  // Throttle energy updates to avoid creating new arrays every frame
  const lastEnergyUpdateRef = useRef<number>(0);
  const energyBufferRef = useRef<EnergyState[]>([]);
  const ENERGY_UPDATE_INTERVAL = 33; // ~30fps instead of 60fps

  const handleEnergyUpdate = useCallback((energy: EnergyState) => {
    if (energy.total > 0) {
      const now = performance.now();
      energyBufferRef.current.push(energy);

      // Only update state periodically to avoid array spread every frame
      if (now - lastEnergyUpdateRef.current >= ENERGY_UPDATE_INTERVAL) {
        lastEnergyUpdateRef.current = now;
        const buffered = energyBufferRef.current;
        energyBufferRef.current = [];

        setEnergyHistory((prev) => {
          // Pre-allocate to avoid multiple spreads
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

  // Export controls (buttons don't support tooltips in Leva)
  useControls('Export', {
    'Export CSV': button(() => {
      const sim = new DoublePendulum();
      sim.init(simParams);
      sim.enableRecording(true); // Enable history recording for export
      for (let i = 0; i < 1000; i++) {
        sim.step(1 / 60);
      }
      exportToCSV(sim.export(), 'double-pendulum-data.csv');
    }),
    'Export JSON': button(() => {
      const sim = new DoublePendulum();
      sim.init(simParams);
      sim.enableRecording(true); // Enable history recording for export
      for (let i = 0; i < 1000; i++) {
        sim.step(1 / 60);
      }
      exportToJSON(sim.export(), 'double-pendulum-data.json');
    }),
    Reset: button(() => {
      const resetFn = (window as unknown as { __simReset?: () => void }).__simReset;
      if (resetFn) resetFn();
    }),
  });

  // Memoize to avoid creating new DoublePendulum instance on every render
  const meta = useMemo(() => new DoublePendulum().config.meta, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SimulationCanvas
        cameraPosition={{ x: 0, y: 1, z: 10 }}
        cameraTarget={{ x: 0, y: -1, z: 0 }}
        enablePostProcessing={false} // DISABLED FOR MEMORY TEST
        lowPowerMode={true} // ENABLED FOR MEMORY TEST
      >
        <SimulationRunner
          params={simParams}
          onEnergyUpdate={handleEnergyUpdate}
          onReset={handleReset}
        />
      </SimulationCanvas>

      {/* Info overlay */}
      <SimulationInfo meta={meta} params={simParams} showParams={false} />

      {/* Energy graph */}
      {showEnergy && <EnergyGraph history={energyHistory} />}

      {/* Phase space */}
      {showPhaseSpace && phaseSpace.length > 0 && (
        <PhaseSpaceView data={phaseSpace} labels={['θ₁', 'θ₂']} />
      )}
    </div>
  );
}
