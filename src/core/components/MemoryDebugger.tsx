/**
 * MemoryDebugger
 * Real-time memory profiling and diagnostics for optimization
 */

import { useEffect, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useSimulationStore } from '../stores';

interface MemoryStats {
  // JS Heap
  jsHeapUsed: number;
  jsHeapTotal: number;
  jsHeapLimit: number;

  // Three.js resources
  geometries: number;
  textures: number;
  programs: number;

  // Render info
  triangles: number;
  points: number;
  lines: number;
  calls: number;

  // App data
  trailPoints: number;
  phasePoints: number;
  trailArrays: number;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  geometries: number;
  trailPoints: number;
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Inner component that has access to Three.js context
function ThreeMemoryStats({ onUpdate }: { onUpdate: (stats: Partial<MemoryStats>) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const interval = setInterval(() => {
      const info = gl.info;
      onUpdate({
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        calls: info.render.calls,
      });
    }, 500);

    return () => clearInterval(interval);
  }, [gl, onUpdate]);

  return null;
}

// Exportable component for use inside Canvas
export function MemoryDebuggerInCanvas({ onUpdate }: { onUpdate: (stats: Partial<MemoryStats>) => void }) {
  return <ThreeMemoryStats onUpdate={onUpdate} />;
}

// Main debugger panel (renders outside Canvas)
export function MemoryDebugger() {
  const [stats, setStats] = useState<MemoryStats>({
    jsHeapUsed: 0,
    jsHeapTotal: 0,
    jsHeapLimit: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    calls: 0,
    trailPoints: 0,
    phasePoints: 0,
    trailArrays: 0,
  });

  const [history, setHistory] = useState<MemorySnapshot[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [threeStats, setThreeStats] = useState<Partial<MemoryStats>>({});

  const { trails, phaseSpace } = useSimulationStore();

  // Update Three.js stats from canvas component
  const handleThreeUpdate = useCallback((newStats: Partial<MemoryStats>) => {
    setThreeStats(newStats);
  }, []);

  // Expose the handler globally so the canvas component can use it
  useEffect(() => {
    (window as unknown as { __memoryDebugUpdate?: (stats: Partial<MemoryStats>) => void }).__memoryDebugUpdate = handleThreeUpdate;
    return () => {
      delete (window as unknown as { __memoryDebugUpdate?: (stats: Partial<MemoryStats>) => void }).__memoryDebugUpdate;
    };
  }, [handleThreeUpdate]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Get JS heap info (Chrome only)
      const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

      // Count trail points
      let totalTrailPoints = 0;
      trails.forEach(trail => {
        totalTrailPoints += trail.length;
      });

      let totalPhasePoints = 0;
      phaseSpace.forEach(phase => {
        totalPhasePoints += phase.length;
      });

      const newStats: MemoryStats = {
        jsHeapUsed: memory?.usedJSHeapSize ?? 0,
        jsHeapTotal: memory?.totalJSHeapSize ?? 0,
        jsHeapLimit: memory?.jsHeapSizeLimit ?? 0,
        geometries: threeStats.geometries ?? 0,
        textures: threeStats.textures ?? 0,
        programs: threeStats.programs ?? 0,
        triangles: threeStats.triangles ?? 0,
        points: threeStats.points ?? 0,
        lines: threeStats.lines ?? 0,
        calls: threeStats.calls ?? 0,
        trailPoints: totalTrailPoints,
        phasePoints: totalPhasePoints,
        trailArrays: trails.length,
      };

      setStats(newStats);

      // Record history for trend analysis
      setHistory(prev => {
        const snapshot: MemorySnapshot = {
          timestamp: Date.now(),
          heapUsed: newStats.jsHeapUsed,
          geometries: newStats.geometries,
          trailPoints: totalTrailPoints,
        };
        const next = [...prev, snapshot];
        // Keep last 60 snapshots (30 seconds at 500ms interval)
        return next.slice(-60);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [trails, phaseSpace, threeStats]);

  // Calculate memory trend
  const memoryTrend = history.length >= 2
    ? history[history.length - 1].heapUsed - history[0].heapUsed
    : 0;

  // Estimate data structure sizes
  const estimatedTrailMemory = stats.trailPoints * 40; // ~40 bytes per TrailPoint (3 floats + time + overhead)
  const estimatedPhaseMemory = stats.phasePoints * 24; // ~24 bytes per PhasePoint

  // Force garbage collection (if exposed)
  const forceGC = () => {
    if ((window as unknown as { gc?: () => void }).gc) {
      (window as unknown as { gc: () => void }).gc();
      console.log('GC triggered');
    } else {
      console.log('GC not exposed. Run Chrome with --expose-gc flag');
    }
  };

  // Dump detailed memory info to console
  const dumpMemoryInfo = () => {
    console.group('Memory Debug Dump');
    console.log('JS Heap:', formatBytes(stats.jsHeapUsed), '/', formatBytes(stats.jsHeapTotal));
    console.log('Trail Arrays:', stats.trailArrays);
    console.log('Total Trail Points:', stats.trailPoints);
    console.log('Estimated Trail Memory:', formatBytes(estimatedTrailMemory));
    console.log('Phase Points:', stats.phasePoints);
    console.log('Estimated Phase Memory:', formatBytes(estimatedPhaseMemory));
    console.log('Three.js Geometries:', stats.geometries);
    console.log('Three.js Textures:', stats.textures);
    console.log('Draw Calls:', stats.calls);
    console.log('Triangles:', stats.triangles);
    console.log('Memory Trend (30s):', formatBytes(memoryTrend));
    console.log('History:', history);
    console.groupEnd();
  };

  const heapPercent = stats.jsHeapLimit > 0
    ? ((stats.jsHeapUsed / stats.jsHeapLimit) * 100).toFixed(1)
    : '?';

  const isHighMemory = stats.jsHeapUsed > 500 * 1024 * 1024; // > 500MB
  const isCritical = stats.jsHeapUsed > 1024 * 1024 * 1024; // > 1GB

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        zIndex: 10000,
        background: isCritical ? '#7f1d1d' : isHighMemory ? '#78350f' : '#0f172a',
        border: `1px solid ${isCritical ? '#dc2626' : isHighMemory ? '#f59e0b' : '#334155'}`,
        borderRadius: 8,
        padding: expanded ? 12 : 8,
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#f1f5f9',
        minWidth: expanded ? 280 : 120,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: expanded ? 8 : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontWeight: 'bold', color: isCritical ? '#fca5a5' : isHighMemory ? '#fcd34d' : '#6366f1' }}>
          {isCritical ? '⚠️ ' : isHighMemory ? '⚡ ' : '📊 '}
          Memory: {formatBytes(stats.jsHeapUsed)}
        </span>
        <span style={{ color: '#64748b' }}>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <>
          {/* JS Heap */}
          <div style={{ marginBottom: 8, padding: 8, background: '#1e293b', borderRadius: 4 }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>JS Heap ({heapPercent}% of limit)</div>
            <div style={{
              height: 6,
              background: '#334155',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, parseFloat(heapPercent))}%`,
                background: isCritical ? '#dc2626' : isHighMemory ? '#f59e0b' : '#6366f1',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#64748b' }}>
              <span>Used: {formatBytes(stats.jsHeapUsed)}</span>
              <span>Limit: {formatBytes(stats.jsHeapLimit)}</span>
            </div>
          </div>

          {/* App Data */}
          <div style={{ marginBottom: 8, padding: 8, background: '#1e293b', borderRadius: 4 }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>App Data</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
              <span>Trail Arrays:</span><span style={{ textAlign: 'right' }}>{stats.trailArrays}</span>
              <span>Trail Points:</span><span style={{ textAlign: 'right' }}>{stats.trailPoints.toLocaleString()}</span>
              <span>Est. Trail Mem:</span><span style={{ textAlign: 'right' }}>{formatBytes(estimatedTrailMemory)}</span>
              <span>Phase Points:</span><span style={{ textAlign: 'right' }}>{stats.phasePoints.toLocaleString()}</span>
            </div>
          </div>

          {/* Three.js */}
          <div style={{ marginBottom: 8, padding: 8, background: '#1e293b', borderRadius: 4 }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>Three.js Resources</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
              <span>Geometries:</span><span style={{ textAlign: 'right' }}>{stats.geometries}</span>
              <span>Textures:</span><span style={{ textAlign: 'right' }}>{stats.textures}</span>
              <span>Programs:</span><span style={{ textAlign: 'right' }}>{stats.programs}</span>
              <span>Draw Calls:</span><span style={{ textAlign: 'right' }}>{stats.calls}</span>
              <span>Triangles:</span><span style={{ textAlign: 'right' }}>{stats.triangles.toLocaleString()}</span>
              <span>Lines:</span><span style={{ textAlign: 'right' }}>{stats.lines.toLocaleString()}</span>
            </div>
          </div>

          {/* Trend */}
          <div style={{ marginBottom: 8, padding: 8, background: '#1e293b', borderRadius: 4 }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>30s Trend</div>
            <span style={{ color: memoryTrend > 0 ? '#f87171' : '#4ade80' }}>
              {memoryTrend > 0 ? '↑' : '↓'} {formatBytes(Math.abs(memoryTrend))}
              {memoryTrend > 10 * 1024 * 1024 && ' (LEAK?)'}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={forceGC}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: '#334155',
                border: 'none',
                borderRadius: 4,
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              Force GC
            </button>
            <button
              onClick={dumpMemoryInfo}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: '#334155',
                border: 'none',
                borderRadius: 4,
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              Dump to Console
            </button>
          </div>
        </>
      )}
    </div>
  );
}
