/**
 * Simulation State Store
 * Manages playback, timing, and simulation state
 *
 * Memory management: Data older than MAX_DATA_AGE_SECONDS is automatically purged
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PhysicsState, EnergyState, TrailPoint, PhasePoint } from '../types';

// Maximum age for scientific data in seconds (prevents memory leaks)
const MAX_DATA_AGE_SECONDS = 30;

// How often to run cleanup (every N frames)
const CLEANUP_INTERVAL_FRAMES = 60;

interface SimulationStore {
  // Playback state
  isPlaying: boolean;
  speed: number;
  elapsedTime: number;
  frameCount: number;

  // Physics state
  physicsState: PhysicsState | null;
  energy: EnergyState;

  // Visualization data
  trails: TrailPoint[][];
  phaseSpace: PhasePoint[][];
  maxTrailLength: number;

  // Display options
  showTrails: boolean;
  showVectors: boolean;
  showEnergy: boolean;
  showPhaseSpace: boolean;
  showGrid: boolean;
  showStats: boolean;

  // Actions
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setPhysicsState: (state: PhysicsState) => void;
  setEnergy: (energy: EnergyState) => void;
  addTrailPoints: (points: TrailPoint[]) => void;
  addPhasePoints: (points: PhasePoint[]) => void;
  clearTrails: () => void;
  setShowTrails: (show: boolean) => void;
  setShowVectors: (show: boolean) => void;
  setShowEnergy: (show: boolean) => void;
  setShowPhaseSpace: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  setMaxTrailLength: (length: number) => void;
  tick: (dt: number) => void;
}

/**
 * Filter trail points to only keep those within the time window
 */
function filterByTime<T extends { time: number }>(
  data: T[],
  currentTime: number,
  maxAge: number
): T[] {
  const cutoff = currentTime - maxAge;
  // Find first index that's within the time window
  let startIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].time >= cutoff) {
      startIdx = i;
      break;
    }
    // If we reach the end, all data is old
    if (i === data.length - 1) {
      return [];
    }
  }
  return startIdx === 0 ? data : data.slice(startIdx);
}

export const useSimulationStore = create<SimulationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isPlaying: false,
    speed: 1,
    elapsedTime: 0,
    frameCount: 0,

    physicsState: null,
    energy: { kinetic: 0, potential: 0, total: 0 },

    trails: [],
    phaseSpace: [],
    maxTrailLength: 500, // ~6 seconds at 165fps (adding every 2nd frame)

    showTrails: true,
    showVectors: false,
    showEnergy: true,
    showPhaseSpace: false,
    showGrid: true,
    showStats: true,

    // Actions
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),

    reset: () =>
      set({
        isPlaying: false,
        elapsedTime: 0,
        frameCount: 0,
        trails: [],
        phaseSpace: [],
        energy: { kinetic: 0, potential: 0, total: 0 },
      }),

    setSpeed: (speed) => set({ speed: Math.max(0.1, Math.min(10, speed)) }),

    setPhysicsState: (state) => set({ physicsState: state }),

    setEnergy: (energy) => set({ energy }),

    addTrailPoints: (points) => {
      const { trails, maxTrailLength, frameCount, elapsedTime } = get();

      // Only add trail points every 2nd frame to reduce overhead
      if (frameCount % 2 !== 0) return;

      const shouldCleanup = frameCount % CLEANUP_INTERVAL_FRAMES === 0;
      let newTrails = trails.length === points.length ? trails : [...trails];

      points.forEach((point, i) => {
        if (!newTrails[i]) {
          newTrails[i] = [];
        }

        // Push new point
        newTrails[i].push(point);

        // Periodic time-based cleanup (removes data older than 30 seconds)
        if (shouldCleanup && newTrails[i].length > 0) {
          newTrails[i] = filterByTime(newTrails[i], elapsedTime, MAX_DATA_AGE_SECONDS);
        }

        // Also enforce max length as a hard cap
        if (newTrails[i].length > maxTrailLength) {
          newTrails[i] = newTrails[i].slice(-maxTrailLength);
        }
      });

      set({ trails: newTrails });
    },

    addPhasePoints: (points) => {
      const { phaseSpace, maxTrailLength, frameCount, elapsedTime } = get();

      // Only add every 2nd frame
      if (frameCount % 2 !== 0) return;

      const shouldCleanup = frameCount % CLEANUP_INTERVAL_FRAMES === 0;
      const newPhaseSpace = phaseSpace.length === points.length ? phaseSpace : [...phaseSpace];

      points.forEach((point, i) => {
        if (!newPhaseSpace[i]) {
          newPhaseSpace[i] = [];
        }

        newPhaseSpace[i].push(point);

        // Periodic time-based cleanup
        if (shouldCleanup && newPhaseSpace[i].length > 0) {
          newPhaseSpace[i] = filterByTime(newPhaseSpace[i], elapsedTime, MAX_DATA_AGE_SECONDS);
        }

        // Hard cap
        if (newPhaseSpace[i].length > maxTrailLength) {
          newPhaseSpace[i] = newPhaseSpace[i].slice(-maxTrailLength);
        }
      });

      set({ phaseSpace: newPhaseSpace });
    },

    clearTrails: () => set({ trails: [], phaseSpace: [] }),

    setShowTrails: (show) => set({ showTrails: show }),
    setShowVectors: (show) => set({ showVectors: show }),
    setShowEnergy: (show) => set({ showEnergy: show }),
    setShowPhaseSpace: (show) => set({ showPhaseSpace: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setShowStats: (show) => set({ showStats: show }),
    setMaxTrailLength: (length) => set({ maxTrailLength: length }),

    tick: (dt) => {
      const { isPlaying, speed, elapsedTime, frameCount } = get();
      if (!isPlaying) return;

      set({
        elapsedTime: elapsedTime + dt * speed,
        frameCount: frameCount + 1,
      });
    },
  }))
);
