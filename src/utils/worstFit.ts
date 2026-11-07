import { GradientTriangle, ProcessedPoint, RegressionResult, WorstFitResult } from '../types';

/**
 * Calculates worst-fit lines (maximum gradient and minimum gradient) passing through error bars.
 * Method: Pivoting about the centroid (mean point), the line is rotated clockwise and counterclockwise
 * until it reaches the edge of the error boxes, with robust bounds based on extreme points.
 */
export function calculateWorstFitLines(
  points: ProcessedPoint[],
  regression: RegressionResult
): WorstFitResult {
  const n = points.length;
  if (n < 2) {
    return {
      maxLine: { label: 'Max Gradient', m: regression.m, c: regression.c, color: '#f59e0b', type: 'max' },
      minLine: { label: 'Min Gradient', m: regression.m, c: regression.c, color: '#8b5cf6', type: 'min' },
      deltaM: 0,
      deltaC: 0,
      methodDescription: 'Insufficient points for worst-fit lines.',
    };
  }

  const meanX = regression.meanX;
  const meanY = regression.meanY;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const dxSpan = last.x - first.x;
  if (Math.abs(dxSpan) < 1e-12) {
    return {
      maxLine: { label: 'Max Gradient', m: regression.m, c: regression.c, color: '#f59e0b', type: 'max' },
      minLine: { label: 'Min Gradient', m: regression.m, c: regression.c, color: '#8b5cf6', type: 'min' },
      deltaM: 0,
      deltaC: 0,
      methodDescription: 'All X values identical.',
    };
  }

  // 1. Extreme error bounds method (classic UK/IB/A-Level method)
  // Steepest line passes through (x_first, y_first - dy) and (x_last, y_last + dy)
  const dyFirst = first.dy || (Math.abs(regression.m) * (first.dx || 0)) || 0.01;
  const dyLast = last.dy || (Math.abs(regression.m) * (last.dx || 0)) || 0.01;

  const m_steep_extreme = ((last.y + dyLast) - (first.y - dyFirst)) / dxSpan;
  const c_steep_extreme = meanY - m_steep_extreme * meanX;

  const m_shallow_extreme = ((last.y - dyLast) - (first.y + dyFirst)) / dxSpan;
  const c_shallow_extreme = meanY - m_shallow_extreme * meanX;

  // 2. Centroid pivot method: find the tightest upper and lower slope limits from all points
  let maxSlopeLimit = Infinity;
  let minSlopeLimit = -Infinity;

  for (const p of points) {
    const dx = p.x - meanX;
    const effDy = Math.max(p.dy || 0, Math.abs(regression.m) * (p.dx || 0), 1e-5);

    if (Math.abs(dx) > 0.05 * dxSpan) {
      if (dx > 0) {
        // Point is to the right of centroid
        const upperM = (p.y + effDy - meanY) / dx;
        const lowerM = (p.y - effDy - meanY) / dx;
        if (upperM < maxSlopeLimit) maxSlopeLimit = upperM;
        if (lowerM > minSlopeLimit) minSlopeLimit = lowerM;
      } else {
        // Point is to the left of centroid (dx < 0)
        const upperM = (p.y - effDy - meanY) / dx;
        const lowerM = (p.y + effDy - meanY) / dx;
        if (upperM < maxSlopeLimit) maxSlopeLimit = upperM;
        if (lowerM > minSlopeLimit) minSlopeLimit = lowerM;
      }
    }
  }

  // Harmonize limits so m_max >= regression.m >= m_min
  let m_max = m_steep_extreme;
  let m_min = m_shallow_extreme;

  if (maxSlopeLimit > minSlopeLimit && Number.isFinite(maxSlopeLimit) && Number.isFinite(minSlopeLimit)) {
    // If centroid pivot limits are consistent with best fit, blend or use them
    m_max = Math.max(regression.m, Math.min(m_steep_extreme, maxSlopeLimit));
    m_min = Math.min(regression.m, Math.max(m_shallow_extreme, minSlopeLimit));
  }

  // Ensure m_max is truly >= regression.m and m_min <= regression.m
  if (m_max < regression.m) m_max = regression.m + Math.max(Math.abs(m_steep_extreme - regression.m), regression.se_m * 1.5);
  if (m_min > regression.m) m_min = regression.m - Math.max(Math.abs(regression.m - m_shallow_extreme), regression.se_m * 1.5);

  const c_max = meanY - m_max * meanX;
  const c_min = meanY - m_min * meanX;

  const deltaM = Math.abs(m_max - m_min) / 2;
  const deltaC = Math.abs(c_max - c_min) / 2;

  return {
    maxLine: {
      label: 'Steepest Fit (m_max)',
      m: m_max,
      c: c_max,
      color: '#f59e0b', // Amber
      type: 'max',
    },
    minLine: {
      label: 'Shallowest Fit (m_min)',
      m: m_min,
      c: c_min,
      color: '#8b5cf6', // Violet
      type: 'min',
    },
    deltaM,
    deltaC,
    methodDescription: `Worst-fit lines pivoted about mean point (x̄, ȳ) constrained by error bars: Δm = (m_max − m_min) / 2 = ${deltaM.toFixed(4)}.`,
  };
}

/**
 * Chooses two widely separated points on the best-fit line (spanning >= 50% of the line)
 * to form the classic gradient triangle: m = Δy / Δx.
 */
export function calculateGradientTriangle(
  points: ProcessedPoint[],
  regression: RegressionResult
): GradientTriangle {
  if (points.length < 2) {
    return { x1: 0, y1: 0, x2: 1, y2: 1, dx: 1, dy: 1, gradient: 1 };
  }

  const xVals = points.map((p) => p.x);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const span = maxX - minX;

  // Place points at 12% and 88% of data span (76% separation, well over 50%)
  const x1 = minX + 0.12 * span;
  const x2 = minX + 0.88 * span;
  const y1 = regression.m * x1 + regression.c;
  const y2 = regression.m * x2 + regression.c;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const gradient = dx !== 0 ? dy / dx : 0;

  return {
    x1,
    y1,
    x2,
    y2,
    dx,
    dy,
    gradient,
  };
}
