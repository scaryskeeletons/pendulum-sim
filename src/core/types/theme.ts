/**
 * Color Theme System
 * Strongly typed color variables for consistent visualization across simulations
 */

export interface ColorValue {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
}

export interface SimulationColors {
  // Primary elements
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;

  // Physical objects
  mass: string;
  rod: string;
  pivot: string;
  trail: string;

  // Energy visualization
  kineticEnergy: string;
  potentialEnergy: string;
  totalEnergy: string;

  // Phase space
  phaseTrajectory: string;
  phasePoint: string;

  // Environment
  background: string;
  grid: string;
  axis: string;

  // UI overlays
  text: string;
  textMuted: string;
  panel: string;
  panelBorder: string;
}

export interface ThemeConfig {
  name: string;
  colors: SimulationColors;
  bloom?: {
    intensity: number;
    luminanceThreshold: number;
    luminanceSmoothing: number;
  };
  ambient?: {
    intensity: number;
    color: string;
  };
  fog?: {
    color: string;
    near: number;
    far: number;
  };
}

// Default dark scientific theme
export const darkTheme: ThemeConfig = {
  name: 'Dark Scientific',
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    tertiary: '#a855f7',
    accent: '#22d3ee',

    mass: '#f97316',
    rod: '#94a3b8',
    pivot: '#64748b',
    trail: '#6366f1',

    kineticEnergy: '#22c55e',
    potentialEnergy: '#ef4444',
    totalEnergy: '#eab308',

    phaseTrajectory: '#8b5cf6',
    phasePoint: '#22d3ee',

    background: '#0f172a',
    grid: '#1e293b',
    axis: '#334155',

    text: '#f8fafc',
    textMuted: '#94a3b8',
    panel: '#1e293b',
    panelBorder: '#334155',
  },
  bloom: {
    intensity: 0.5,
    luminanceThreshold: 0.8,
    luminanceSmoothing: 0.9,
  },
  ambient: {
    intensity: 0.4,
    color: '#ffffff',
  },
};

export const neonTheme: ThemeConfig = {
  name: 'Neon',
  colors: {
    primary: '#00ffff',
    secondary: '#ff00ff',
    tertiary: '#ffff00',
    accent: '#00ff00',

    mass: '#ff00ff',
    rod: '#00ffff',
    pivot: '#ffffff',
    trail: '#00ffff',

    kineticEnergy: '#00ff00',
    potentialEnergy: '#ff0000',
    totalEnergy: '#ffff00',

    phaseTrajectory: '#ff00ff',
    phasePoint: '#00ffff',

    background: '#000000',
    grid: '#111111',
    axis: '#222222',

    text: '#ffffff',
    textMuted: '#888888',
    panel: '#111111',
    panelBorder: '#333333',
  },
  bloom: {
    intensity: 1.2,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.8,
  },
  ambient: {
    intensity: 0.2,
    color: '#ffffff',
  },
};

export const scientificTheme: ThemeConfig = {
  name: 'Scientific Paper',
  colors: {
    primary: '#2563eb',
    secondary: '#dc2626',
    tertiary: '#16a34a',
    accent: '#9333ea',

    mass: '#1f2937',
    rod: '#4b5563',
    pivot: '#6b7280',
    trail: '#2563eb',

    kineticEnergy: '#16a34a',
    potentialEnergy: '#dc2626',
    totalEnergy: '#ca8a04',

    phaseTrajectory: '#2563eb',
    phasePoint: '#dc2626',

    background: '#f8fafc',
    grid: '#e2e8f0',
    axis: '#94a3b8',

    text: '#0f172a',
    textMuted: '#64748b',
    panel: '#ffffff',
    panelBorder: '#e2e8f0',
  },
  bloom: {
    intensity: 0,
    luminanceThreshold: 1,
    luminanceSmoothing: 1,
  },
  ambient: {
    intensity: 0.8,
    color: '#ffffff',
  },
};

export const themes: Record<string, ThemeConfig> = {
  dark: darkTheme,
  neon: neonTheme,
  scientific: scientificTheme,
};
