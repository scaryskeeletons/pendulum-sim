/**
 * SimulationInfo
 * Displays simulation metadata and current state info
 */

import { useThemeStore, useSimulationStore } from '../stores';
import type { SimulationMeta } from '../types';

interface SimulationInfoProps {
  meta: SimulationMeta;
  params?: Record<string, unknown>;
  showParams?: boolean;
}

export function SimulationInfo({
  meta,
  params,
  showParams = false,
}: SimulationInfoProps) {
  const colors = useThemeStore((s) => s.colors);
  const { elapsedTime, isPlaying, speed } = useSimulationStore();

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: `${colors.panel}dd`,
        borderRadius: 8,
        padding: 15,
        border: `1px solid ${colors.panelBorder}`,
        fontFamily: 'system-ui, sans-serif',
        color: colors.text,
        maxWidth: 280,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {meta.name}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 12,
        }}
      >
        {meta.description}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontSize: 12,
        }}
      >
        <span style={{ color: colors.textMuted }}>Time:</span>
        <span style={{ fontFamily: 'monospace' }}>{elapsedTime.toFixed(2)}s</span>

        <span style={{ color: colors.textMuted }}>Status:</span>
        <span style={{ fontFamily: 'monospace' }}>
          {isPlaying ? `Playing (${speed}x)` : 'Paused'}
        </span>

        {meta.category && (
          <>
            <span style={{ color: colors.textMuted }}>Category:</span>
            <span style={{ textTransform: 'capitalize' }}>{meta.category}</span>
          </>
        )}
      </div>

      {showParams && params && Object.keys(params).length > 0 && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${colors.panelBorder}`, paddingTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 6,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Parameters
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '2px 12px',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            {Object.entries(params).map(([key, value]) => (
              <span key={key}>
                <span style={{ color: colors.textMuted }}>{key}:</span>{' '}
                {typeof value === 'number' ? value.toFixed(3) : String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {meta.tags && meta.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
          {meta.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: colors.primary + '33',
                color: colors.primary,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 10,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
