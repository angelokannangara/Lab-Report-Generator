import { ProcessedPoint, RegressionResult } from '../types';

/**
 * Perform least-squares linear regression (y = mx + c).
 * Supports both standard unweighted regression and weighted regression using 1 / (dy)^2.
 */
export function calculateLinearRegression(
  points: ProcessedPoint[],
  weighted: boolean = false
): RegressionResult {
  const n = points.length;
  if (n < 2) {
    return {
      m: 0,
      c: 0,
      r2: 0,
      r: 0,
      se_m: 0,
      se_c: 0,
      sumX: 0,
      sumY: 0,
      sumXY: 0,
      sumX2: 0,
      sumY2: 0,
      n,
      meanX: 0,
      meanY: 0,
      weighted: false,
    };
  }

  if (weighted && points.every((p) => p.dy > 0)) {
    // Weighted least squares
    let sumW = 0;
    let sumWX = 0;
    let sumWY = 0;
    let sumWXY = 0;
    let sumWX2 = 0;
    let sumWY2 = 0;

    for (const p of points) {
      const w = 1 / (p.dy * p.dy);
      sumW += w;
      sumWX += w * p.x;
      sumWY += w * p.y;
      sumWXY += w * p.x * p.y;
      sumWX2 += w * p.x * p.x;
      sumWY2 += w * p.y * p.y;
    }

    const delta = sumW * sumWX2 - sumWX * sumWX;
    if (Math.abs(delta) < 1e-12) {
      // Degenerate (all X identical)
      return {
        m: 0,
        c: sumWY / sumW,
        r2: 0,
        r: 0,
        se_m: 0,
        se_c: 0,
        sumX: sumWX,
        sumY: sumWY,
        sumXY: sumWXY,
        sumX2: sumWX2,
        sumY2: sumWY2,
        n,
        meanX: sumWX / sumW,
        meanY: sumWY / sumW,
        weighted: true,
      };
    }

    const m = (sumW * sumWXY - sumWX * sumWY) / delta;
    const c = (sumWX2 * sumWY - sumWX * sumWXY) / delta;

    const se_m = Math.sqrt(sumW / delta);
    const se_c = Math.sqrt(sumWX2 / delta);

    // Compute weighted R^2
    const meanY = sumWY / sumW;
    let ssTot = 0;
    let ssRes = 0;
    for (const p of points) {
      const w = 1 / (p.dy * p.dy);
      const yFit = m * p.x + c;
      ssTot += w * Math.pow(p.y - meanY, 2);
      ssRes += w * Math.pow(p.y - yFit, 2);
    }
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;

    return {
      m,
      c,
      r2,
      r: Math.sqrt(r2) * (m >= 0 ? 1 : -1),
      se_m,
      se_c,
      sumX: sumWX,
      sumY: sumWY,
      sumXY: sumWXY,
      sumX2: sumWX2,
      sumY2: sumWY2,
      n,
      meanX: sumWX / sumW,
      meanY: sumWY / sumW,
      weighted: true,
    };
  }

  // Standard unweighted least squares
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) {
    // Degenerate (all X identical)
    return {
      m: 0,
      c: meanY,
      r2: 0,
      r: 0,
      se_m: 0,
      se_c: 0,
      sumX,
      sumY,
      sumXY,
      sumX2,
      sumY2,
      n,
      meanX,
      meanY,
      weighted: false,
    };
  }

  const m = (n * sumXY - sumX * sumY) / denom;
  const c = (sumY - m * sumX) / n;

  // Residual sum of squares & standard error
  let ssTot = 0;
  let ssRes = 0;
  let ssXX = 0;

  for (const p of points) {
    const yFit = m * p.x + c;
    ssTot += Math.pow(p.y - meanY, 2);
    ssRes += Math.pow(p.y - yFit, 2);
    ssXX += Math.pow(p.x - meanX, 2);
  }

  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const r = Math.sqrt(r2) * (m >= 0 ? 1 : -1);

  // Degrees of freedom is n - 2
  const dof = Math.max(1, n - 2);
  const s_yx = Math.sqrt(ssRes / dof);

  const se_m = ssXX > 0 ? s_yx / Math.sqrt(ssXX) : 0;
  const se_c = ssXX > 0 ? s_yx * Math.sqrt(1 / n + (meanX * meanX) / ssXX) : 0;

  return {
    m,
    c,
    r2,
    r,
    se_m,
    se_c,
    sumX,
    sumY,
    sumXY,
    sumX2,
    sumY2,
    n,
    meanX,
    meanY,
    weighted: false,
  };
}
