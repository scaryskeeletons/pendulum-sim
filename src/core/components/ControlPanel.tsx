/**
 * ControlPanel
 * Unified control panel for simulation parameters and visualization options
 */

import { useControls, button } from 'leva';
import { useEffect } from 'react';
import { useSimulationStore, useThemeStore } from '../stores';
import { themes } from '../types';

interface ControlPanelProps {
  onReset: () => void;
  onExport?: () => void;
  showVisualization?: boolean;
  showTheme?: boolean;
}

export function ControlPanel({
  onReset,
  onExport,
  showVisualization = true,
  showTheme = true,
}: ControlPanelProps) {
  const {
    isPlaying,
    speed,
    showTrails,
    showVectors,
    showEnergy,
    showGrid,
    maxTrailLength,
    play,
    pause,
    reset,
    setSpeed,
    setShowTrails,
    setShowVectors,
    setShowEnergy,
    setShowGrid,
    setMaxTrailLength,
    clearTrails,
  } = useSimulationStore();

  const { themeName, setTheme, setColorOverride, clearOverrides, colors } =
    useThemeStore();

  // Playback controls
  useControls('Playback', {
    playing: {
      value: isPlaying,
      onChange: (v) => (v ? play() : pause()),
    },
    speed: {
      value: speed,
      min: 0.1,
      max: 5,
      step: 0.1,
      onChange: setSpeed,
    },
    reset: button(() => {
      reset();
      onReset();
    }),
  });

  // Visualization controls
  if (showVisualization) {
    useControls('Visualization', {
      trails: {
        value: showTrails,
        onChange: setShowTrails,
      },
      trailLength: {
        value: maxTrailLength,
        min: 50,
        max: 2000,
        step: 50,
        onChange: setMaxTrailLength,
      },
      clearTrails: button(() => clearTrails()),
      vectors: {
        value: showVectors,
        onChange: setShowVectors,
      },
      energy: {
        value: showEnergy,
        onChange: setShowEnergy,
      },
      grid: {
        value: showGrid,
        onChange: setShowGrid,
      },
    });
  }

  // Theme controls
  if (showTheme) {
    useControls('Theme', {
      preset: {
        value: themeName,
        options: Object.keys(themes),
        onChange: setTheme,
      },
      'Reset Colors': button(() => clearOverrides()),
    });
  }

  // Color overrides
  if (showTheme) {
    useControls('Colors', {
      mass: {
        value: colors.mass,
        onChange: (v: string) => setColorOverride('mass', v),
      },
      rod: {
        value: colors.rod,
        onChange: (v: string) => setColorOverride('rod', v),
      },
      trail: {
        value: colors.trail,
        onChange: (v: string) => setColorOverride('trail', v),
      },
      pivot: {
        value: colors.pivot,
        onChange: (v: string) => setColorOverride('pivot', v),
      },
    });
  }

  // Export controls
  if (onExport) {
    useControls('Export', {
      'Export Data': button(() => onExport()),
    });
  }

  return null; // Leva renders its own UI
}

/**
 * Hook to create simulation-specific parameter controls
 */
export function useSimulationControls<T extends Record<string, unknown>>(
  name: string,
  defaultParams: T,
  onChange: (params: T) => void
): T {
  const controls = useControls(name, defaultParams as Record<string, unknown>);

  useEffect(() => {
    onChange(controls as T);
  }, [controls, onChange]);

  return controls as T;
}
