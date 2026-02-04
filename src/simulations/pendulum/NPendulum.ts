/**
 * NPendulum
 * Chain of N pendulums - generalized multi-pendulum system
 *
 * Model Assumptions:
 * - Rods are rigid, massless, and inextensible
 * - All mass is concentrated at point masses (bobs)
 * - All segments have equal length and mass
 * - Motion is constrained to a 2D plane
 * - Pivot point is fixed and frictionless
 * - No air resistance (optional damping simulates energy loss)
 * - Gravitational field is uniform (constant g)
 * - Uses simplified coupling (not full Lagrangian for N bodies)
 */

import { BaseSimulation } from '../templates/BaseSimulation';
import type {
  SimulationConfig,
  PhysicsState,
  EnergyState,
  PhasePoint,
} from '../../core/types';

export interface NPendulumParams {
  n: number;
  lengths: number[];
  masses: number[];
  gravity: number;
  damping: number;
  initialAngles: number[];
  initialVelocities: number[];
}

export class NPendulum extends BaseSimulation {
  private n: number = 3;

  // Pre-allocated buffers to avoid allocation every call (max n=10, state size=20)
  private _derivBuffer: number[] = new Array(20).fill(0);
  private _alphasBuffer: number[] = new Array(10).fill(0);

  config: SimulationConfig = {
    meta: {
      id: 'n-pendulum',
      name: 'N-Pendulum Chain',
      description: '',
      category: 'pendulum',
      tags: [],
    },
    defaultParams: {
      n: { value: 3, min: 2, max: 10, step: 1, label: 'Number of Pendulums' },
      segmentLength: { value: 0.8, min: 0.1, max: 2, step: 0.1, label: 'Segment Length (m)' },
      segmentMass: { value: 1, min: 0.1, max: 5, step: 0.1, label: 'Segment Mass (kg)' },
      gravity: { value: 9.81, min: 0.1, max: 25, step: 0.01, label: 'Gravity (m/s²)' },
      damping: { value: 0.01, min: 0, max: 0.5, step: 0.01, label: 'Damping' },
      initialSpread: {
        value: Math.PI / 6,
        min: 0,
        max: Math.PI,
        step: 0.01,
        label: 'Initial Spread (rad)',
      },
    },
    physics: {
      gravity: 9.81,
      damping: 0.01,
      integrationMethod: 'rk4',
      fixedTimestep: 1 / 480,
    },
    visualization: {
      showTrails: true,
      trailLength: 600,
      showVectors: false,
      showEnergy: true,
      showPhaseSpace: false, // Too many dimensions
    },
    camera: {
      position: { x: 0, y: 0, z: 12 },
      target: { x: 0, y: -2, z: 0 },
      fov: 50,
    },
  };

  protected createInitialState(): number[] {
    const p = this.params as Record<string, number>;
    this.n = p.n;

    // State: [theta1, theta2, ..., thetaN, omega1, omega2, ..., omegaN]
    const state: number[] = [];

    // Initial angles - spread from vertical
    for (let i = 0; i < this.n; i++) {
      state.push(p.initialSpread * (1 - i / this.n));
    }

    // Initial velocities - all zero
    for (let i = 0; i < this.n; i++) {
      state.push(0);
    }

    return state;
  }

  protected computeDerivatives(_t: number, state: number[]): number[] {
    const p = this.params as Record<string, number>;
    const n = this.n;
    const g = p.gravity;
    const L = p.segmentLength;
    const damping = p.damping;

    // Read thetas and omegas directly from state (avoid slice allocation)
    // state layout: [theta0, theta1, ..., theta(n-1), omega0, omega1, ..., omega(n-1)]

    // For simplicity, use a numerical approximation of the mass matrix approach
    // This is a simplified model that approximates the coupled equations

    for (let i = 0; i < n; i++) {
      const theta_i = state[i];
      const omega_i = state[n + i];
      let alpha = 0;

      // Gravity term
      alpha -= (g / L) * Math.sin(theta_i) * (n - i);

      // Coupling with previous pendulum
      if (i > 0) {
        const delta = theta_i - state[i - 1];
        const omega_prev = state[n + i - 1];
        alpha += (omega_prev * omega_prev * Math.sin(delta)) / 2;
      }

      // Coupling with next pendulum
      if (i < n - 1) {
        const delta = state[i + 1] - theta_i;
        const omega_next = state[n + i + 1];
        alpha -= (omega_next * omega_next * Math.sin(delta)) / 2;
      }

      // Damping
      alpha -= damping * omega_i;

      this._alphasBuffer[i] = alpha;
    }

    // Build result: [omegas..., alphas...]
    for (let i = 0; i < n; i++) {
      this._derivBuffer[i] = state[n + i];     // omega_i
      this._derivBuffer[n + i] = this._alphasBuffer[i]; // alpha_i
    }

    return this._derivBuffer;
  }

  protected stateToPhysics(state: number[]): PhysicsState {
    const p = this.params as Record<string, number>;
    const n = this.n;
    const L = p.segmentLength;

    const thetas = state.slice(0, n);
    const omegas = state.slice(n);

    const positions = [];
    const velocities = [];

    let x = 0,
      y = 0;
    let vx = 0,
      vy = 0;

    for (let i = 0; i < n; i++) {
      x += L * Math.sin(thetas[i]);
      y -= L * Math.cos(thetas[i]);

      vx += L * omegas[i] * Math.cos(thetas[i]);
      vy += L * omegas[i] * Math.sin(thetas[i]);

      positions.push({ x, y, z: 0 });
      velocities.push({ x: vx, y: vy, z: 0 });
    }

    return {
      time: this.time,
      positions,
      velocities,
    };
  }

  getEnergy(): EnergyState {
    const p = this.params as Record<string, number>;
    const n = this.n;
    const L = p.segmentLength;
    const m = p.segmentMass;
    const g = p.gravity;

    const thetas = this.state.slice(0, n);
    const omegas = this.state.slice(n);

    let kinetic = 0;
    let potential = 0;

    let y = 0;
    let vx = 0,
      vy = 0;

    for (let i = 0; i < n; i++) {
      y -= L * Math.cos(thetas[i]);

      vx += L * omegas[i] * Math.cos(thetas[i]);
      vy += L * omegas[i] * Math.sin(thetas[i]);

      kinetic += 0.5 * m * (vx * vx + vy * vy);
      potential += m * g * (y + (i + 1) * L); // Reference: all hanging straight down
    }

    return {
      kinetic,
      potential,
      total: kinetic + potential,
    };
  }

  getPhaseSpace(): PhasePoint[] {
    const n = this.n;
    const thetas = this.state.slice(0, n);
    const omegas = this.state.slice(n);

    return thetas.map((theta, i) => ({
      angle: theta,
      angularVelocity: omegas[i],
      time: this.time,
    }));
  }
}
