/**
 * DoublePendulum
 * Double pendulum exhibiting chaotic motion
 * Uses Lagrangian mechanics for accurate simulation
 *
 * Model Assumptions:
 * - Rods are rigid, massless, and inextensible
 * - All mass is concentrated at point masses (bobs)
 * - Motion is constrained to a 2D plane (no out-of-plane swing)
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

export interface DoublePendulumParams {
  length1: number;
  length2: number;
  mass1: number;
  mass2: number;
  gravity: number;
  damping: number;
  initialAngle1: number;
  initialAngle2: number;
  initialVelocity1: number;
  initialVelocity2: number;
}

export class DoublePendulum extends BaseSimulation {
  // Pre-allocated buffer for derivatives to avoid allocation every call
  private _derivBuffer: number[] = [0, 0, 0, 0];

  config: SimulationConfig = {
    meta: {
      id: 'double-pendulum',
      name: 'Double Pendulum',
      description: '',
      category: 'pendulum',
      tags: [],
    },
    defaultParams: {
      length1: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Length 1 (m)' },
      length2: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Length 2 (m)' },
      mass1: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass 1 (kg)' },
      mass2: { value: 1, min: 0.1, max: 10, step: 0.1, label: 'Mass 2 (kg)' },
      gravity: { value: 9.81, min: 0.1, max: 25, step: 0.01, label: 'Gravity (m/s²)' },
      damping: { value: 0, min: 0, max: 0.5, step: 0.01, label: 'Damping' },
      initialAngle1: {
        value: Math.PI / 2,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
        label: 'Initial θ₁ (rad)',
      },
      initialAngle2: {
        value: Math.PI / 2,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
        label: 'Initial θ₂ (rad)',
      },
      initialVelocity1: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.1,
        label: 'Initial ω₁ (rad/s)',
      },
      initialVelocity2: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.1,
        label: 'Initial ω₂ (rad/s)',
      },
    },
    physics: {
      gravity: 9.81,
      damping: 0,
      integrationMethod: 'rk4',
      fixedTimestep: 1 / 480, // Higher accuracy for chaotic system
    },
    visualization: {
      showTrails: true,
      trailLength: 800,
      showVectors: false,
      showEnergy: true,
      showPhaseSpace: true,
    },
    camera: {
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: -1.5, z: 0 },
      fov: 50,
    },
  };

  private get p(): DoublePendulumParams {
    return this.params as unknown as DoublePendulumParams;
  }

  protected createInitialState(): number[] {
    const p = this.p;
    // State: [theta1, theta2, omega1, omega2]
    return [p.initialAngle1, p.initialAngle2, p.initialVelocity1, p.initialVelocity2];
  }

  protected computeDerivatives(_t: number, state: number[]): number[] {
    const p = this.p;
    const [theta1, theta2, omega1, omega2] = state;

    const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g, damping } = p;

    const delta = theta1 - theta2;
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);

    // Denominators from Lagrangian equations
    const denom1 = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const denom2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));

    // Angular accelerations from Lagrangian mechanics
    const alpha1 =
      (-g * (2 * m1 + m2) * Math.sin(theta1) -
        m2 * g * Math.sin(theta1 - 2 * theta2) -
        2 * sinDelta * m2 * (omega2 * omega2 * L2 + omega1 * omega1 * L1 * cosDelta)) /
        denom1 -
      damping * omega1;

    const alpha2 =
      (2 *
        sinDelta *
        (omega1 * omega1 * L1 * (m1 + m2) +
          g * (m1 + m2) * Math.cos(theta1) +
          omega2 * omega2 * L2 * m2 * cosDelta)) /
        denom2 -
      damping * omega2;

    // Reuse pre-allocated buffer
    this._derivBuffer[0] = omega1;
    this._derivBuffer[1] = omega2;
    this._derivBuffer[2] = alpha1;
    this._derivBuffer[3] = alpha2;
    return this._derivBuffer;
  }

  protected stateToPhysics(state: number[]): PhysicsState {
    const p = this.p;
    const [theta1, theta2, omega1, omega2] = state;

    // First pendulum position
    const x1 = p.length1 * Math.sin(theta1);
    const y1 = -p.length1 * Math.cos(theta1);

    // Second pendulum position (relative to first)
    const x2 = x1 + p.length2 * Math.sin(theta2);
    const y2 = y1 - p.length2 * Math.cos(theta2);

    // Velocities
    const vx1 = p.length1 * omega1 * Math.cos(theta1);
    const vy1 = p.length1 * omega1 * Math.sin(theta1);

    const vx2 = vx1 + p.length2 * omega2 * Math.cos(theta2);
    const vy2 = vy1 + p.length2 * omega2 * Math.sin(theta2);

    return {
      time: this.time,
      positions: [
        { x: x1, y: y1, z: 0 },
        { x: x2, y: y2, z: 0 },
      ],
      velocities: [
        { x: vx1, y: vy1, z: 0 },
        { x: vx2, y: vy2, z: 0 },
      ],
    };
  }

  getEnergy(): EnergyState {
    const p = this.p;
    const [theta1, theta2, omega1, omega2] = this.state;

    const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g } = p;

    // Positions
    const y1 = -L1 * Math.cos(theta1);
    const y2 = y1 - L2 * Math.cos(theta2);

    // Velocities squared
    const v1Sq = Math.pow(L1 * omega1, 2);
    const v2Sq =
      Math.pow(L1 * omega1, 2) +
      Math.pow(L2 * omega2, 2) +
      2 * L1 * L2 * omega1 * omega2 * Math.cos(theta1 - theta2);

    // Kinetic energy
    const kinetic = 0.5 * m1 * v1Sq + 0.5 * m2 * v2Sq;

    // Potential energy (reference: both hanging straight down)
    const potential = m1 * g * (y1 + L1) + m2 * g * (y2 + L1 + L2);

    return {
      kinetic,
      potential,
      total: kinetic + potential,
    };
  }

  getPhaseSpace(): PhasePoint[] {
    const [theta1, theta2, omega1, omega2] = this.state;
    return [
      { angle: theta1, angularVelocity: omega1, time: this.time },
      { angle: theta2, angularVelocity: omega2, time: this.time },
    ];
  }

  /**
   * Calculate Lyapunov exponent (measure of chaos)
   */
  getLyapunovExponent(): number {
    // Simplified calculation - would need trajectory divergence for accurate value
    const energy = this.getEnergy();
    const p = this.p;
    // Higher energy = more chaotic behavior
    return Math.log(1 + energy.total / (p.mass1 + p.mass2) / p.gravity);
  }
}
