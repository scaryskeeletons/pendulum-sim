/**
 * PhaseSpaceView
 * 2D phase space visualization overlay
 */

import { useMemo } from 'react';
import type { PhasePoint } from '../types';
import { useThemeStore } from '../stores';

interface PhaseSpaceViewProps {
  data: PhasePoint[][];
  width?: number;
  height?: number;
  labels?: string[];
}

export function PhaseSpaceView({
  data,
  width = 250,
  height = 250,
  labels = [],
}: PhaseSpaceViewProps) {
  const colors = useThemeStore((s) => s.colors);

  const { paths, currentPoints } = useMemo(() => {
    if (data.length === 0 || data.every((d) => d.length < 2)) {
      return { paths: [], currentPoints: [] };
    }

    // Find bounds
    let minAngle = Infinity,
      maxAngle = -Infinity;
    let minOmega = Infinity,
      maxOmega = -Infinity;

    for (const trajectory of data) {
      for (const p of trajectory) {
        minAngle = Math.min(minAngle, p.angle);
        maxAngle = Math.max(maxAngle, p.angle);
        minOmega = Math.min(minOmega, p.angularVelocity);
        maxOmega = Math.max(maxOmega, p.angularVelocity);
      }
    }

    // Add padding
    const anglePad = (maxAngle - minAngle) * 0.1 || 0.5;
    const omegaPad = (maxOmega - minOmega) * 0.1 || 1;
    minAngle -= anglePad;
    maxAngle += anglePad;
    minOmega -= omegaPad;
    maxOmega += omegaPad;

    const padding = 30;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const mapX = (angle: number) =>
      padding + ((angle - minAngle) / (maxAngle - minAngle)) * graphWidth;
    const mapY = (omega: number) =>
      padding + graphHeight - ((omega - minOmega) / (maxOmega - minOmega)) * graphHeight;

    const trajectoryColors = [
      colors.phaseTrajectory,
      colors.primary,
      colors.secondary,
      colors.tertiary,
    ];

    const paths = data.map((trajectory) => {
      if (trajectory.length < 2) return '';
      return trajectory
        .map((p, j) => {
          const x = mapX(p.angle);
          const y = mapY(p.angularVelocity);
          return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    });

    const currentPoints = data.map((trajectory, i) => {
      const last = trajectory[trajectory.length - 1];
      if (!last) return null;
      return {
        x: mapX(last.angle),
        y: mapY(last.angularVelocity),
        color: trajectoryColors[i % trajectoryColors.length],
      };
    });

    return { paths, currentPoints };
  }, [data, width, height, colors]);

  const trajectoryColors = [
    colors.phaseTrajectory,
    colors.primary,
    colors.secondary,
    colors.tertiary,
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        background: `${colors.panel}ee`,
        borderRadius: 8,
        padding: 10,
        border: `1px solid ${colors.panelBorder}`,
        fontFamily: 'monospace',
        fontSize: 11,
        color: colors.text,
      }}
    >
      <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Phase Space</div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Axes */}
        <line
          x1={30}
          y1={height - 30}
          x2={width - 30}
          y2={height - 30}
          stroke={colors.axis}
          strokeWidth={1}
        />
        <line
          x1={30}
          y1={30}
          x2={30}
          y2={height - 30}
          stroke={colors.axis}
          strokeWidth={1}
        />

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 8}
          fill={colors.textMuted}
          fontSize={10}
          textAnchor="middle"
        >
          θ (rad)
        </text>
        <text
          x={10}
          y={height / 2}
          fill={colors.textMuted}
          fontSize={10}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${height / 2})`}
        >
          ω (rad/s)
        </text>

        {/* Trajectories */}
        {paths.map(
          (path, i) =>
            path && (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={trajectoryColors[i % trajectoryColors.length]}
                strokeWidth={1.5}
                opacity={0.8}
              />
            )
        )}

        {/* Current points */}
        {currentPoints.map(
          (point, i) =>
            point && (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={point.color}
              />
            )
        )}
      </svg>

      {/* Legend */}
      {labels.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
          {labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: trajectoryColors[i % trajectoryColors.length],
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
