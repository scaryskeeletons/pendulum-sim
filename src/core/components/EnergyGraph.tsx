/**
 * EnergyGraph
 * Overlay showing real-time energy visualization
 */

import { useMemo } from 'react';
import type { EnergyState } from '../types';
import { useThemeStore } from '../stores';

interface EnergyGraphProps {
  history: EnergyState[];
  maxPoints?: number;
  width?: number;
  height?: number;
}

export function EnergyGraph({
  history,
  maxPoints = 200,
  width = 300,
  height = 120,
}: EnergyGraphProps) {
  const colors = useThemeStore((s) => s.colors);

  const { paths, currentEnergy } = useMemo(() => {
    const data = history.slice(-maxPoints);
    if (data.length < 2) {
      return { paths: { kinetic: '', potential: '', total: '' }, maxEnergy: 1, currentEnergy: null };
    }

    // Find max energy for scaling
    let maxE = 0;
    for (const e of data) {
      maxE = Math.max(maxE, e.kinetic, e.potential, e.total);
    }
    maxE = maxE || 1;

    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const createPath = (key: keyof EnergyState): string => {
      return data
        .map((e, i) => {
          const x = padding + (i / (data.length - 1)) * graphWidth;
          const y = padding + graphHeight - (e[key] / maxE) * graphHeight;
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    };

    return {
      paths: {
        kinetic: createPath('kinetic'),
        potential: createPath('potential'),
        total: createPath('total'),
      },
      maxEnergy: maxE,
      currentEnergy: data[data.length - 1] ?? null,
    };
  }, [history, maxPoints, width, height]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: `${colors.panel}ee`,
        borderRadius: 8,
        padding: 10,
        border: `1px solid ${colors.panelBorder}`,
        fontFamily: 'monospace',
        fontSize: 11,
        color: colors.text,
      }}
    >
      <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Energy</div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        <line
          x1={10}
          y1={height - 10}
          x2={width - 10}
          y2={height - 10}
          stroke={colors.grid}
          strokeWidth={1}
        />
        <line
          x1={10}
          y1={10}
          x2={10}
          y2={height - 10}
          stroke={colors.grid}
          strokeWidth={1}
        />

        {/* Energy curves */}
        {paths.total && (
          <path
            d={paths.total}
            fill="none"
            stroke={colors.totalEnergy}
            strokeWidth={2}
            opacity={0.9}
          />
        )}
        {paths.kinetic && (
          <path
            d={paths.kinetic}
            fill="none"
            stroke={colors.kineticEnergy}
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}
        {paths.potential && (
          <path
            d={paths.potential}
            fill="none"
            stroke={colors.potentialEnergy}
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 15, marginTop: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 3,
              background: colors.kineticEnergy,
              borderRadius: 1,
            }}
          />
          <span>KE: {currentEnergy?.kinetic.toFixed(3) ?? '0'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 3,
              background: colors.potentialEnergy,
              borderRadius: 1,
            }}
          />
          <span>PE: {currentEnergy?.potential.toFixed(3) ?? '0'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 12,
              height: 3,
              background: colors.totalEnergy,
              borderRadius: 1,
            }}
          />
          <span>E: {currentEnergy?.total.toFixed(3) ?? '0'}</span>
        </div>
      </div>
    </div>
  );
}
