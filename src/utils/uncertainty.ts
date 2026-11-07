import { evaluateFormula } from './math';
import { UncertaintyMethod } from '../types';

export interface RepeatStats {
  mean: number;
  count: number;
  min: number;
  max: number;
  range: number;
  halfRange: number;
  sampleStdDev: number;
  stdError: number;
  leastCount: number;
  absoluteUncertainty: number;
  relativeUncertainty: number; // fractional
  percentageUncertainty: number;
  methodUsed: UncertaintyMethod;
}

/**
 * Calculates repeat measurement statistics and uncertainty based on least count and spread.
 */
export function calculateRepeatStats(
  readings: number[],
  leastCount: number = 0.001,
  method: UncertaintyMethod = 'half_range'
): RepeatStats {
  const valid = readings.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) {
    return {
      mean: 0,
      count: 0,
      min: 0,
      max: 0,
      range: 0,
      halfRange: 0,
      sampleStdDev: 0,
      stdError: 0,
      leastCount,
      absoluteUncertainty: leastCount,
      relativeUncertainty: 0,
      percentageUncertainty: 0,
      methodUsed: method,
    };
  }

  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min;
  const halfRange = range / 2;

  let sampleStdDev = 0;
  if (valid.length > 1) {
    const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (valid.length - 1);
    sampleStdDev = Math.sqrt(variance);
  }
  const stdError = valid.length > 0 ? sampleStdDev / Math.sqrt(valid.length) : 0;

  let spreadUncertainty = 0;
  if (method === 'half_range') {
    spreadUncertainty = halfRange;
  } else if (method === 'std_error') {
    spreadUncertainty = stdError;
  } else {
    spreadUncertainty = 0;
  }

  // The absolute uncertainty is the larger of the least count (instrument resolution)
  // or the spread of repeated readings (random error).
  const absoluteUncertainty = Math.max(leastCount, spreadUncertainty);
  const relativeUncertainty = mean !== 0 ? Math.abs(absoluteUncertainty / mean) : 0;
  const percentageUncertainty = relativeUncertainty * 100;

  return {
    mean,
    count: valid.length,
    min,
    max,
    range,
    halfRange,
    sampleStdDev,
    stdError,
    leastCount,
    absoluteUncertainty,
    relativeUncertainty,
    percentageUncertainty,
    methodUsed: method,
  };
}

/**
 * Propagate uncertainty for derived columns:
 * Inspects formula pattern:
 * - Constant scaling: c * X -> |c| * dX
 * - Division by constant: X / c -> dX / |c|
 * - Power: X^n -> |n| * (dX / |X|) * |Z|
 * - Linear: X + Y or X - Y -> sqrt(dX^2 + dY^2)
 * - General numerical finite difference derivative if arbitrary formula
 */
export function propagateColumnUncertainty(
  formula: string,
  variables: Record<string, { value: number; uncertainty: number }>,
  derivedValue: number
): {
  uncertainty: number;
  percentageUncertainty: number;
  ruleExplanation: string;
} {
  const trimmed = formula.trim().replace(/\s+/g, '');

  // 1. Division by constant, e.g. "t/20"
  const divMatch = trimmed.match(/^([a-zA-Z_]\w*)\/([0-9.]+)$/);
  if (divMatch) {
    const varName = divMatch[1];
    const c = parseFloat(divMatch[2]);
    const v = variables[varName];
    if (v && c > 0) {
      const unc = v.uncertainty / c;
      const pct = derivedValue !== 0 ? Math.abs(unc / derivedValue) * 100 : 0;
      return {
        uncertainty: unc,
        percentageUncertainty: pct,
        ruleExplanation: `Constant divisor rule: \\Delta(${varName}/${c}) = \\frac{\\Delta ${varName}}{${c}}`,
      };
    }
  }

  // 2. Power rule, e.g. "T^2" or "T**2"
  const powMatch = trimmed.match(/^([a-zA-Z_]\w*)\^([0-9.]+)$/) || trimmed.match(/^([a-zA-Z_]\w*)\*\*([0-9.]+)$/);
  if (powMatch) {
    const varName = powMatch[1];
    const n = parseFloat(powMatch[2]);
    const v = variables[varName];
    if (v && v.value !== 0) {
      const fracUnc = Math.abs(n) * (v.uncertainty / Math.abs(v.value));
      const unc = fracUnc * Math.abs(derivedValue);
      const pct = fracUnc * 100;
      return {
        uncertainty: unc,
        percentageUncertainty: pct,
        ruleExplanation: `Power rule: \\frac{\\Delta(${varName}^{${n}})}{${varName}^{${n}}} = ${n} \\cdot \\frac{\\Delta ${varName}}{${varName}}`,
      };
    }
  }

  // 3. Inverse rule, e.g. "1/R"
  const invMatch = trimmed.match(/^1\/([a-zA-Z_]\w*)$/);
  if (invMatch) {
    const varName = invMatch[1];
    const v = variables[varName];
    if (v && v.value !== 0) {
      const fracUnc = v.uncertainty / Math.abs(v.value);
      const unc = fracUnc * Math.abs(derivedValue);
      const pct = fracUnc * 100;
      return {
        uncertainty: unc,
        percentageUncertainty: pct,
        ruleExplanation: `Reciprocal rule: \\Delta(1/${varName}) = \\frac{\\Delta ${varName}}{${varName}^2}`,
      };
    }
  }

  // 4. General numerical partial derivatives method:
  // Delta f = sqrt( sum( (df/dx_i * dx_i)^2 ) )
  let sumSq = 0;
  const scope: Record<string, number> = {};
  for (const k in variables) {
    scope[k] = variables[k].value;
  }

  for (const k in variables) {
    const originalVal = variables[k].value;
    const dx = variables[k].uncertainty || 1e-6;
    const h = Math.max(Math.abs(originalVal) * 1e-4, 1e-6);

    const scopePlus = { ...scope, [k]: originalVal + h };
    const scopeMinus = { ...scope, [k]: originalVal - h };

    const fPlus = evaluateFormula(formula, scopePlus);
    const fMinus = evaluateFormula(formula, scopeMinus);

    if (Number.isFinite(fPlus) && Number.isFinite(fMinus)) {
      const df_dx = (fPlus - fMinus) / (2 * h);
      sumSq += Math.pow(df_dx * dx, 2);
    }
  }

  const unc = Math.sqrt(sumSq);
  const pct = derivedValue !== 0 ? Math.abs(unc / derivedValue) * 100 : 0;
  return {
    uncertainty: Number.isFinite(unc) ? unc : 0,
    percentageUncertainty: Number.isFinite(pct) ? pct : 0,
    ruleExplanation: `Partial derivatives: \\Delta f = \\sqrt{ \\sum \\left( \\frac{\\partial f}{\\partial x_i} \\Delta x_i \\right)^2 }`,
  };
}
