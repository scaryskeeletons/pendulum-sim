/**
 * SimplePendulumScene
 * Complete scene for the simple pendulum simulation
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
import { SimplePendulum } from './SimplePendulum';
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
    SimplePendulum,
    params,
    { autoStart: false, recordTrails: true, recordPhaseSpace: true }
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
      massRadius={0.2}
      rodRadius={0.04}
    />
  );
}

export function SimplePendulumScene() {
  // Simulation parameters
  const simParams = useControls('Pendulum Parameters', {
    length: { value: 2, min: 0.1, max: 5, step: 0.1, label: 'Length (m)', hint: 'Length of the pendulum string/rod in meters' },
    mass: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass (kg)', hint: 'Mass of the pendulum bob in kilograms' },
    gravity: { value: 9.81, min: 0.1, max: 25, step: 0.1, label: 'Gravity (m/s²)', hint: 'Gravitational acceleration (Earth: 9.81, Moon: 1.62)' },
    damping: { value: 0, min: 0, max: 1, step: 0.01, label: 'Damping', hint: 'Energy dissipation coefficient (0 = ideal, no friction)' },
    initialAngle: { value: Math.PI / 4, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Initial Angle', hint: 'Starting angle in radians (π/4 = 45°)' },
    initialVelocity: { value: 0, min: -10, max: 10, step: 0.1, label: 'Initial Velocity', hint: 'Initial angular velocity in radians per second' },
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
    trails: { value: showTrails, onChange: setShowTrails, hint: 'Show motion trail behind the pendulum bob' },
    trailLength: { value: maxTrailLength, min: 100, max: 2000, step: 100, onChange: setMaxTrailLength, hint: 'Maximum number of trail points to display' },
    energy: { value: showEnergy, onChange: setShowEnergy, hint: 'Show real-time energy graph (KE, PE, Total)' },
    phaseSpace: { value: showPhaseSpace, onChange: setShowPhaseSpace, hint: 'Show phase portrait (angle θ vs angular velocity ω)' },
    grid: { value: showGrid, onChange: setShowGrid, hint: 'Show reference grid in the scene' },
    'Clear Trails': button(() => clearTrails()),
  });

  // Theme
  const { themeName, setTheme, setColorOverride, colors } = useThemeStore();

  useControls('Theme', {
    preset: { value: themeName, options: Object.keys(themes), onChange: setTheme, hint: 'Visual theme preset (dark, neon, scientific)' },
  });
  useControls('Colors', {
    mass: { value: colors.mass, onChange: (v: string) => setColorOverride('mass', v), hint: 'Color of the pendulum bob mass' },
    rod: { value: colors.rod, onChange: (v: string) => setColorOverride('rod', v), hint: 'Color of the pendulum rod/string' },
    trail: { value: colors.trail, onChange: (v: string) => setColorOverride('trail', v), hint: 'Color of the motion trail' },
  });

  // Energy history - limited to ~30 seconds of data to prevent memory buildup
  const MAX_ENERGY_HISTORY = 900;
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

  // Theoretical period display
  const theoreticalPeriod = 2 * Math.PI * Math.sqrt(simParams.length / simParams.gravity);

  useControls('Export', {
    'Export CSV': button(() => {
      const sim = new SimplePendulum();
      sim.init(simParams);
      sim.enableRecording(true); // Enable history recording for export
      for (let i = 0; i < 1000; i++) sim.step(1 / 60);
      exportToCSV(sim.export(), 'simple-pendulum-data.csv');
    }),
    Reset: button(() => {
      const resetFn = (window as unknown as { __simReset?: () => void }).__simReset;
      if (resetFn) resetFn();
    }),
  });

  // Memoize to avoid creating new SimplePendulum instance on every render
  const meta = useMemo(() => new SimplePendulum().config.meta, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SimulationCanvas
        cameraPosition={{ x: 0, y: 1, z: 8 }}
        cameraTarget={{ x: 0, y: -0.5, z: 0 }}
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

      {/* Theoretical period info */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 20,
          background: `${colors.panel}dd`,
          borderRadius: 8,
          padding: 10,
          border: `1px solid ${colors.panelBorder}`,
          fontFamily: 'monospace',
          fontSize: 12,
          color: colors.text,
        }}
      >
        <div style={{ color: colors.textMuted, marginBottom: 4 }}>Theoretical Period (small angle)</div>
        <div>T = 2π√(L/g) = {theoreticalPeriod.toFixed(4)}s</div>
      </div>

      {showEnergy && <EnergyGraph history={energyHistory} />}
      {showPhaseSpace && phaseSpace.length > 0 && (
        <PhaseSpaceView data={phaseSpace} labels={['θ']} />
      )}
    </div>
  );
}
