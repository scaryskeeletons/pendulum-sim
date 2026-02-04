/**
 * Main Application
 * Simulation picker and router
 */

import { useState, useCallback, useEffect } from 'react';
import { Leva } from 'leva';
import { useThemeStore } from './core/stores';

// Custom Leva theme with readable tooltips
const levaTheme = {
  colors: {
    elevation1: '#1e293b',
    elevation2: '#0f172a',
    elevation3: '#334155',
    accent1: '#6366f1',
    accent2: '#818cf8',
    accent3: '#a5b4fc',
    highlight1: '#f8fafc',
    highlight2: '#e2e8f0',
    highlight3: '#cbd5e1',
    // Tooltip colors - dark background, light text, fully opaque
    toolTipBackground: '#0f172a',
    toolTipText: '#f1f5f9',
  },
  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
};
import {
  SimplePendulumScene,
  DoublePendulumScene,
  NPendulumScene,
} from './simulations';

type SimulationType = 'simple' | 'double' | 'n-pendulum';

interface SimulationOption {
  id: SimulationType;
  name: string;
  description: string;
  icon: string;
}

const simulations: SimulationOption[] = [
  {
    id: 'simple',
    name: 'Simple Pendulum',
    description: 'Single mass, periodic motion',
    icon: '1',
  },
  {
    id: 'double',
    name: 'Double Pendulum',
    description: 'Coupled masses, chaotic motion',
    icon: '2',
  },
  {
    id: 'n-pendulum',
    name: 'N-Pendulum',
    description: 'Variable length chain',
    icon: 'N',
  },
];

function SimulationPicker({
  onSelect,
}: {
  onSelect: (sim: SimulationType) => void;
}) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: colors.text,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 120,
          fontWeight: 900,
          color: colors.textMuted,
          opacity: 0.04,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '0.1em',
        }}
      >
        AWAWAWAWAW
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 500,
          marginBottom: 40,
          color: colors.text,
          letterSpacing: '-0.02em',
        }}
      >
        Pendulum Lab
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 16,
        }}
      >
        {simulations.map((sim) => (
          <button
            key={sim.id}
            onClick={() => onSelect(sim.id)}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.panelBorder}`,
              borderRadius: 8,
              padding: '20px 24px',
              width: 200,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.background = colors.panel;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.panelBorder;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                color: colors.primary,
                fontFamily: 'monospace',
              }}
            >
              {sim.icon}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                marginBottom: 4,
                color: colors.text,
              }}
            >
              {sim.name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: colors.textMuted,
              }}
            >
              {sim.description}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 48,
          fontSize: 12,
          color: colors.textMuted,
        }}
      >
        <kbd
          style={{
            background: colors.panel,
            padding: '2px 6px',
            borderRadius: 3,
            border: `1px solid ${colors.panelBorder}`,
            fontSize: 11,
          }}
        >
          ESC
        </kbd>{' '}
        to return
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        border: 'none',
        borderRadius: 6,
        padding: '6px 12px',
        color: colors.textMuted,
        cursor: 'pointer',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        transition: 'color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.textMuted;
      }}
    >
      ← Back
    </button>
  );
}

export default function App() {
  const [currentSim, setCurrentSim] = useState<SimulationType | null>(null);

  const handleBack = useCallback(() => {
    setCurrentSim(null);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentSim) {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSim, handleBack]);

  if (!currentSim) {
    return (
      <>
        <Leva hidden theme={levaTheme} />
        <SimulationPicker onSelect={setCurrentSim} />
      </>
    );
  }

  return (
    <>
      <Leva collapsed={false} theme={levaTheme} />
      <BackButton onClick={handleBack} />
      {currentSim === 'simple' && <SimplePendulumScene />}
      {currentSim === 'double' && <DoublePendulumScene />}
      {currentSim === 'n-pendulum' && <NPendulumScene />}
    </>
  );
}
