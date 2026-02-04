/**
 * Data Export Utilities
 * Export simulation data for papers and analysis
 */

import type { ExportData } from '../core/types';

/**
 * Export data to JSON file
 */
export function exportToJSON(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename ?? `${data.meta.id}-export.json`);
}

/**
 * Export time series data to CSV
 */
export function exportToCSV(data: ExportData, filename?: string): void {
  const { timeSeries, phaseSpace } = data;
  const lines: string[] = [];

  // Header
  const headers = ['time'];
  const numBodies = timeSeries.positions[0]?.length ?? 0;

  for (let i = 0; i < numBodies; i++) {
    headers.push(`x${i}`, `y${i}`, `z${i}`, `vx${i}`, `vy${i}`, `vz${i}`);
  }
  headers.push('kinetic', 'potential', 'total');

  if (phaseSpace && phaseSpace.length > 0) {
    for (let i = 0; i < phaseSpace.length; i++) {
      headers.push(`theta${i}`, `omega${i}`);
    }
  }

  lines.push(headers.join(','));

  // Data rows
  for (let t = 0; t < timeSeries.time.length; t++) {
    const row: (string | number)[] = [timeSeries.time[t].toFixed(6)];

    for (let i = 0; i < numBodies; i++) {
      const pos = timeSeries.positions[t]?.[i] ?? { x: 0, y: 0, z: 0 };
      const vel = timeSeries.velocities[t]?.[i] ?? { x: 0, y: 0, z: 0 };
      row.push(
        pos.x.toFixed(6),
        pos.y.toFixed(6),
        pos.z.toFixed(6),
        vel.x.toFixed(6),
        vel.y.toFixed(6),
        vel.z.toFixed(6)
      );
    }

    const energy = timeSeries.energy[t] ?? { kinetic: 0, potential: 0, total: 0 };
    row.push(
      energy.kinetic.toFixed(6),
      energy.potential.toFixed(6),
      energy.total.toFixed(6)
    );

    if (phaseSpace) {
      for (let i = 0; i < phaseSpace.length; i++) {
        const point = phaseSpace[i]?.[t];
        if (point) {
          row.push(point.angle.toFixed(6), point.angularVelocity.toFixed(6));
        }
      }
    }

    lines.push(row.join(','));
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename ?? `${data.meta.id}-export.csv`);
}

/**
 * Export LaTeX-ready table
 */
export function exportToLatex(
  data: { label: string; value: number | string; unit?: string }[],
  caption: string,
  label: string
): string {
  const lines = [
    '\\begin{table}[htbp]',
    '\\centering',
    `\\caption{${caption}}`,
    `\\label{${label}}`,
    '\\begin{tabular}{lrl}',
    '\\toprule',
    'Parameter & Value & Unit \\\\',
    '\\midrule',
  ];

  for (const row of data) {
    const value = typeof row.value === 'number' ? row.value.toFixed(4) : row.value;
    lines.push(`${row.label} & ${value} & ${row.unit ?? ''} \\\\`);
  }

  lines.push('\\bottomrule', '\\end{tabular}', '\\end{table}');

  return lines.join('\n');
}

/**
 * Capture canvas to image
 */
export async function captureCanvas(
  canvas: HTMLCanvasElement,
  filename = 'simulation-capture.png'
): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename);
      }
      resolve();
    }, 'image/png');
  });
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format number for scientific notation
 */
export function toScientific(n: number, precision = 3): string {
  if (n === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  return `${mantissa.toFixed(precision)} × 10^${exp}`;
}

/**
 * Calculate statistics for a dataset
 */
export function calculateStats(data: number[]): {
  mean: number;
  std: number;
  min: number;
  max: number;
  range: number;
} {
  if (data.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, range: 0 };
  }

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);

  return { mean, std, min, max, range: max - min };
}
