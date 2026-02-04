/**
 * Core Simulation Types
 * Base interfaces that all simulations must implement
 */

import type { ThemeConfig } from './theme';

// Vector types for physics calculations
export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Physics state for any simulation
export interface PhysicsState {
  time: number;
  positions: Vector3[];
  velocities: Vector3[];
  accelerations?: Vector3[];
}

// Energy tracking for scientific analysis
export interface EnergyState {
  kinetic: number;
  potential: number;
  total: number;
}

// Parameter definition for auto-generating UI controls
export interface ParameterDef<T = number | boolean | string> {
  value: T;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  description?: string;
  group?: string;
}

export type ParameterSchema = Record<string, ParameterDef>;

// Trail/trajectory data for visualization
export interface TrailPoint {
  position: Vector3;
  time: number;
  energy?: number;
}

// Phase space point for analysis
export interface PhasePoint {
  angle: number;
  angularVelocity: number;
  time: number;
}

// Simulation metadata
export interface SimulationMeta {
  id: string;
  name: string;
  description: string;
  category: 'pendulum' | 'particle' | 'wave' | 'field' | 'other';
  author?: string;
  version?: string;
  tags?: string[];
}

// Base simulation configuration
export interface SimulationConfig {
  meta: SimulationMeta;
  defaultParams: ParameterSchema;

  // Physics settings
  physics: {
    gravity: number;
    damping: number;
    integrationMethod: 'euler' | 'verlet' | 'rk4';
    fixedTimestep: number;
  };

  // Visualization defaults
  visualization: {
    showTrails: boolean;
    trailLength: number;
    showVectors: boolean;
    showEnergy: boolean;
    showPhaseSpace: boolean;
  };

  // Camera defaults
  camera: {
    position: Vector3;
    target: Vector3;
    fov: number;
  };
}

// Runtime simulation state
export interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  elapsedTime: number;
  frameCount: number;
}

// Export data format for papers
export interface ExportData {
  meta: SimulationMeta;
  params: Record<string, unknown>;
  timeSeries: {
    time: number[];
    positions: Vector3[][];
    velocities: Vector3[][];
    energy: EnergyState[];
  };
  phaseSpace?: PhasePoint[][];
}

// Simulation interface that all simulations must implement
export interface Simulation {
  config: SimulationConfig;

  // Initialize with parameters
  init(params: Record<string, unknown>): void;

  // Physics step (called at fixed timestep)
  step(dt: number): PhysicsState;

  // Get current energy state
  getEnergy(): EnergyState;

  // Get phase space data (if applicable)
  getPhaseSpace?(): PhasePoint[];

  // Reset to initial conditions
  reset(): void;

  // Export data for analysis
  export(): ExportData;
}

// Props for simulation renderer components
export interface SimulationRendererProps {
  state: PhysicsState;
  energy: EnergyState;
  theme: ThemeConfig;
  params: Record<string, unknown>;
  showTrails: boolean;
  showVectors: boolean;
  trails: TrailPoint[][];
}

// Playback controls state
export interface PlaybackState {
  isPlaying: boolean;
  speed: number;
  time: number;
  maxTime?: number;
}
