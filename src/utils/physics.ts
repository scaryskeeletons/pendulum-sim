/**
 * Physics Utilities
 * Integration methods and physics calculations
 */

// Generic state type for integration
export type State = number[];

// Derivative function type: f(t, state) => derivatives
export type DerivativeFunc = (t: number, state: State) => State;

/**
 * Euler integration (first-order, fast but less accurate)
 * OPTIMIZED: Uses pre-allocated buffer
 */
const _euler_result: number[] = new Array(20).fill(0);

export function euler(
  state: State,
  t: number,
  dt: number,
  derivatives: DerivativeFunc
): State {
  const n = state.length;
  const d = derivatives(t, state);
  for (let i = 0; i < n; i++) {
    _euler_result[i] = state[i] + d[i] * dt;
  }
  return _euler_result.slice(0, n);
}

/**
 * Velocity Verlet integration (second-order, good for physics)
 * Requires acceleration function
 */
export function verlet(
  positions: number[],
  velocities: number[],
  dt: number,
  accelerations: (pos: number[], vel: number[]) => number[]
): { positions: number[]; velocities: number[] } {
  // Current accelerations
  const a = accelerations(positions, velocities);

  // Update positions
  const newPositions = positions.map(
    (p, i) => p + velocities[i] * dt + 0.5 * a[i] * dt * dt
  );

  // Compute new accelerations
  const newA = accelerations(newPositions, velocities);

  // Update velocities using average acceleration
  const newVelocities = velocities.map(
    (v, i) => v + 0.5 * (a[i] + newA[i]) * dt
  );

  return { positions: newPositions, velocities: newVelocities };
}

/**
 * Runge-Kutta 4th order integration (most accurate)
 * Best for scientific simulations
 *
 * OPTIMIZED: Uses pre-allocated buffers to avoid creating arrays every call.
 * This is critical for performance since RK4 runs at 480+ Hz.
 */

// Pre-allocated buffers for RK4 (sized for max expected state size of 20)
const _rk4_k1: number[] = new Array(20).fill(0);
const _rk4_k2: number[] = new Array(20).fill(0);
const _rk4_k3: number[] = new Array(20).fill(0);
const _rk4_k4: number[] = new Array(20).fill(0);
const _rk4_temp: number[] = new Array(20).fill(0);
const _rk4_result: number[] = new Array(20).fill(0);

export function rk4(
  state: State,
  t: number,
  dt: number,
  derivatives: DerivativeFunc
): State {
  const n = state.length;
  const dt2 = dt / 2;
  const dt6 = dt / 6;

  // k1 = f(t, y)
  const k1Src = derivatives(t, state);
  for (let i = 0; i < n; i++) _rk4_k1[i] = k1Src[i];

  // temp = y + dt/2 * k1, then k2 = f(t + dt/2, temp)
  for (let i = 0; i < n; i++) _rk4_temp[i] = state[i] + dt2 * _rk4_k1[i];
  const k2Src = derivatives(t + dt2, _rk4_temp);
  for (let i = 0; i < n; i++) _rk4_k2[i] = k2Src[i];

  // temp = y + dt/2 * k2, then k3 = f(t + dt/2, temp)
  for (let i = 0; i < n; i++) _rk4_temp[i] = state[i] + dt2 * _rk4_k2[i];
  const k3Src = derivatives(t + dt2, _rk4_temp);
  for (let i = 0; i < n; i++) _rk4_k3[i] = k3Src[i];

  // temp = y + dt * k3, then k4 = f(t + dt, temp)
  for (let i = 0; i < n; i++) _rk4_temp[i] = state[i] + dt * _rk4_k3[i];
  const k4Src = derivatives(t + dt, _rk4_temp);
  for (let i = 0; i < n; i++) _rk4_k4[i] = k4Src[i];

  // y(t + dt) = y + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
  for (let i = 0; i < n; i++) {
    _rk4_result[i] = state[i] + dt6 * (_rk4_k1[i] + 2 * _rk4_k2[i] + 2 * _rk4_k3[i] + _rk4_k4[i]);
  }

  // Return a copy (caller may store the result)
  return _rk4_result.slice(0, n);
}

/**
 * Normalize angle to [-π, π]
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Convert polar to cartesian coordinates
 */
export function polarToCartesian(
  r: number,
  theta: number,
  originX = 0,
  originY = 0
): { x: number; y: number } {
  return {
    x: originX + r * Math.sin(theta),
    y: originY - r * Math.cos(theta),
  };
}

/**
 * Calculate kinetic energy: 0.5 * m * v^2
 */
export function kineticEnergy(mass: number, velocity: number): number {
  return 0.5 * mass * velocity * velocity;
}

/**
 * Calculate gravitational potential energy: m * g * h
 */
export function potentialEnergy(
  mass: number,
  gravity: number,
  height: number
): number {
  return mass * gravity * height;
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
