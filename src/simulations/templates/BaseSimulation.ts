/**
 * BaseSimulation
 * Abstract base class that all simulations extend
 * Provides common functionality and enforces the simulation interface
 */

import type {
  Simulation,
  SimulationConfig,
  PhysicsState,
  EnergyState,
  PhasePoint,
  ExportData,
  Vector3,
} from '../../core/types';
import { rk4, euler } from '../../utils/physics';

export abstract class BaseSimulation implements Simulation {
  abstract config: SimulationConfig;

  protected time: number = 0;
  protected state: number[] = [];
  protected initialState: number[] = [];
  protected params: Record<string, unknown> = {};

  // History for export (disabled during real-time playback to prevent memory leaks)
  protected timeHistory: number[] = [];
  protected positionHistory: Vector3[][] = [];
  protected velocityHistory: Vector3[][] = [];
  protected energyHistory: EnergyState[] = [];
  protected phaseHistory: PhasePoint[][] = [];

  protected maxHistoryLength: number = 10000;

  // Flag to control history recording - disable during real-time playback
  protected recordingEnabled: boolean = false;

  /**
   * Initialize the simulation with parameters
   */
  init(params: Record<string, unknown>): void {
    this.params = { ...this.getDefaultParams(), ...params };
    this.time = 0;
    this.state = this.createInitialState();
    this.initialState = [...this.state];
    this.clearHistory();
  }

  /**
   * Get default parameter values from config
   */
  protected getDefaultParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(this.config.defaultParams)) {
      params[key] = def.value;
    }
    return params;
  }

  /**
   * Create initial state array - must be implemented by subclass
   */
  protected abstract createInitialState(): number[];

  /**
   * Compute derivatives for integration - must be implemented by subclass
   */
  protected abstract computeDerivatives(t: number, state: number[]): number[];

  /**
   * Convert state array to physics state - must be implemented by subclass
   */
  protected abstract stateToPhysics(state: number[]): PhysicsState;

  /**
   * Step the simulation forward
   */
  step(dt: number): PhysicsState {
    const { integrationMethod, fixedTimestep } = this.config.physics;
    const actualDt = fixedTimestep || dt;

    // Choose integration method
    switch (integrationMethod) {
      case 'euler':
        this.state = euler(this.state, this.time, actualDt, (t, s) =>
          this.computeDerivatives(t, s)
        );
        break;
      case 'rk4':
      default:
        this.state = rk4(this.state, this.time, actualDt, (t, s) =>
          this.computeDerivatives(t, s)
        );
        break;
    }

    this.time += actualDt;

    // Get physics state
    const physicsState = this.stateToPhysics(this.state);

    // Record history
    this.recordHistory(physicsState);

    return physicsState;
  }

  /**
   * Record current state to history
   * NOTE: Disabled by default during real-time playback to prevent memory leaks.
   * Call enableRecording(true) before export operations.
   */
  protected recordHistory(physics: PhysicsState): void {
    // Skip recording during real-time playback to prevent memory leaks
    if (!this.recordingEnabled) return;

    // Use circular buffer approach - overwrite instead of shift (O(1) vs O(n))
    if (this.timeHistory.length >= this.maxHistoryLength) {
      // For export, we keep the most recent data by using a simple trim
      // This is called infrequently (only during export recording)
      this.timeHistory = this.timeHistory.slice(-this.maxHistoryLength + 1000);
      this.positionHistory = this.positionHistory.slice(-this.maxHistoryLength + 1000);
      this.velocityHistory = this.velocityHistory.slice(-this.maxHistoryLength + 1000);
      this.energyHistory = this.energyHistory.slice(-this.maxHistoryLength + 1000);
      this.phaseHistory = this.phaseHistory.map(h => h.slice(-this.maxHistoryLength + 1000));
    }

    this.timeHistory.push(physics.time);
    this.positionHistory.push([...physics.positions]);
    this.velocityHistory.push([...physics.velocities]);
    this.energyHistory.push(this.getEnergy());

    const phase = this.getPhaseSpace?.();
    if (phase) {
      phase.forEach((p, i) => {
        if (!this.phaseHistory[i]) this.phaseHistory[i] = [];
        this.phaseHistory[i].push(p);
      });
    }
  }

  /**
   * Enable or disable history recording
   * Disable during real-time playback, enable for export
   */
  enableRecording(enabled: boolean): void {
    this.recordingEnabled = enabled;
    if (enabled) {
      this.clearHistory();
    }
  }

  /**
   * Clear history
   */
  protected clearHistory(): void {
    this.timeHistory = [];
    this.positionHistory = [];
    this.velocityHistory = [];
    this.energyHistory = [];
    this.phaseHistory = [];
  }

  /**
   * Get current energy state - must be implemented by subclass
   */
  abstract getEnergy(): EnergyState;

  /**
   * Get phase space data - optional, for pendulums
   */
  getPhaseSpace?(): PhasePoint[];

  /**
   * Reset to initial conditions
   */
  reset(): void {
    this.time = 0;
    this.state = [...this.initialState];
    this.clearHistory();
  }

  /**
   * Export simulation data
   */
  export(): ExportData {
    return {
      meta: this.config.meta,
      params: this.params,
      timeSeries: {
        time: [...this.timeHistory],
        positions: [...this.positionHistory],
        velocities: [...this.velocityHistory],
        energy: [...this.energyHistory],
      },
      phaseSpace: this.phaseHistory.length > 0 ? [...this.phaseHistory] : undefined,
    };
  }

  /**
   * Get current simulation time
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Get current parameters
   */
  getParams(): Record<string, unknown> {
    return { ...this.params };
  }

  /**
   * Update parameters (requires re-initialization for some)
   */
  setParams(params: Partial<Record<string, unknown>>): void {
    this.params = { ...this.params, ...params };
  }
}
