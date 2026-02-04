/**
 * SimplePendulum
 * Classic simple pendulum simulation with scientific accuracy
 *
 * Model Assumptions:
 * - Rod is rigid, massless, and inextensible
 * - All mass is concentrated at a point mass (bob)
 * - Motion is constrained to a 2D plane
 * - Pivot point is fixed and frictionless
 * - No air resistance (optional damping simulates energy loss)
 * - Gravitational field is uniform (constant g)
 */

import { BaseSimulation } from '../templates/BaseSimulation';
import type {
  SimulationConfig,
  PhysicsState,
  EnergyState,
  PhasePoint,
} from '../../core/types';
import { polarToCartesian } from '../../utils/physics';

export interface SimplePendulumParams {
  length: number;
  mass: number;
  gravity: number;
  damping: number;
  initialAngle: number;
  initialVelocity: number;
}

export class SimplePendulum extends BaseSimulation {
  // Pre-allocated buffer for derivatives to avoid allocation every call
  private _derivBuffer: number[] = [0, 0];

  config: SimulationConfig = {
    meta: {
      id: 'simple-pendulum',
      name: 'Simple Pendulum',
      description: '',
      category: 'pendulum',
      tags: [],
    },
    defaultParams: {
      length: { value: 2, min: 0.1, max: 10, step: 0.1, label: 'Length (m)' },
      mass: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass (kg)' },
      gravity: { value: 9.81, min: 0.1, max: 25, step: 0.01, label: 'Gravity (m/s²)' },
      damping: { value: 0, min: 0, max: 1, step: 0.01, label: 'Damping' },
      initialAngle: {
        value: Math.PI / 4,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
        label: 'Initial Angle (rad)',
      },
      initialVelocity: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.1,
        label: 'Initial Velocity (rad/s)',
      },
    },
    physics: {
      gravity: 9.81,
      damping: 0,
      integrationMethod: 'rk4',
      fixedTimestep: 1 / 240,
    },
    visualization: {
      showTrails: true,
      trailLength: 500,
      showVectors: false,
      showEnergy: true,
      showPhaseSpace: true,
    },
    camera: {
      position: { x: 0, y: 0, z: 8 },
      target: { x: 0, y: -1, z: 0 },
      fov: 50,
    },
  };

  private get p(): SimplePendulumParams {
    return this.params as unknown as SimplePendulumParams;
  }

  protected createInitialState(): number[] {
    const p = this.p;
    // State: [theta, omega]
    return [p.initialAngle, p.initialVelocity];
  }

  protected computeDerivatives(_t: number, state: number[]): number[] {
    const p = this.p;
    const [theta, omega] = state;

    // d(theta)/dt = omega
    // d(omega)/dt = -(g/L)*sin(theta) - damping*omega
    const alpha = -(p.gravity / p.length) * Math.sin(theta) - p.damping * omega;

    // Reuse pre-allocated buffer
    this._derivBuffer[0] = omega;
    this._derivBuffer[1] = alpha;
    return this._derivBuffer;
  }

  protected stateToPhysics(state: number[]): PhysicsState {
    const p = this.p;
    const [theta, omega] = state;

    // Convert to cartesian (pendulum hangs down, so pivot at origin)
    const pos = polarToCartesian(p.length, theta, 0, 0);

    // Velocity in cartesian
    const v = p.length * omega;
    const vx = v * Math.cos(theta);
    const vy = v * Math.sin(theta);

    return {
      time: this.time,
      positions: [{ x: pos.x, y: pos.y, z: 0 }],
      velocities: [{ x: vx, y: vy, z: 0 }],
    };
  }

  getEnergy(): EnergyState {
    const p = this.p;
    const [theta, omega] = this.state;

    // Kinetic energy: 0.5 * m * v^2 = 0.5 * m * (L * omega)^2
    const kinetic = 0.5 * p.mass * Math.pow(p.length * omega, 2);

    // Potential energy: m * g * h (h measured from lowest point)
    // h = L - L*cos(theta) = L*(1 - cos(theta))
    const h = p.length * (1 - Math.cos(theta));
    const potential = p.mass * p.gravity * h;

    return {
      kinetic,
      potential,
      total: kinetic + potential,
    };
  }

  getPhaseSpace(): PhasePoint[] {
    const [theta, omega] = this.state;
    return [{ angle: theta, angularVelocity: omega, time: this.time }];
  }

  /**
   * Calculate theoretical period for small angles
   */
  getTheoreticalPeriod(): number {
    const p = this.p;
    return 2 * Math.PI * Math.sqrt(p.length / p.gravity);
  }
}
