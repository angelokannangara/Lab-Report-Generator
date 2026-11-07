/**
 * Math utilities for physics calculations, formula evaluation, and scientific rounding.
 */

/**
 * Format a number to significant figures.
 */
export function toSignificantFigures(val: number, sigFigs: number): string {
  if (val === 0 || !Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  const exponent = Math.floor(Math.log10(abs));
  const factor = Math.pow(10, sigFigs - 1 - exponent);
  const rounded = Math.round(val * factor) / factor;
  
  if (abs >= 0.001 && abs < 100000) {
    const decimals = Math.max(0, sigFigs - 1 - exponent);
    return rounded.toFixed(decimals);
  }
  return rounded.toPrecision(sigFigs);
}

/**
 * Standard physics rule:
 * Uncertainties are formatted to 1 significant figure, UNLESS the first non-zero digit is '1',
 * in which case 2 significant figures are retained (e.g. 0.14 instead of 0.1, but 0.08 instead of 0.082).
 * Then, the central value is rounded to the same decimal place as the uncertainty.
 */
export function formatValueWithUncertainty(
  value: number,
  uncertainty: number,
  unit: string = ''
): {
  formattedValue: string;
  formattedUncertainty: string;
  combined: string;
  decimalPlaces: number;
} {
  if (!Number.isFinite(value) || !Number.isFinite(uncertainty) || uncertainty < 0) {
    return {
      formattedValue: String(value),
      formattedUncertainty: String(uncertainty),
      combined: `${value} ± ${uncertainty} ${unit}`.trim(),
      decimalPlaces: 2,
    };
  }

  if (uncertainty === 0) {
    return {
      formattedValue: String(value),
      formattedUncertainty: '0',
      combined: `${value} ± 0 ${unit}`.trim(),
      decimalPlaces: 0,
    };
  }

  // Determine sig figs for uncertainty
  const absUnc = Math.abs(uncertainty);
  const exponent = Math.floor(Math.log10(absUnc));
  const firstDigit = Math.floor(absUnc / Math.pow(10, exponent));
  const uncSigFigs = firstDigit === 1 ? 2 : 1;

  // The place value of the least significant digit of uncertainty
  // e.g. for 0.14: exponent -1, sigfigs 2 => place = -1 - 1 = -2 (hundredths, decimals = 2)
  // e.g. for 0.082: exponent -2, sigfigs 1 => place = -2 - 0 = -2 (hundredths, decimals = 2)
  // e.g. for 35.1: exponent 1, sigfigs 1 => place = 1 - 0 = 1 (tens, decimals = 0, round to 10)
  // e.g. for 18.2: exponent 1, sigfigs 2 => place = 1 - 1 = 0 (units, decimals = 0, round to 1)
  const place = exponent - (uncSigFigs - 1);
  const step = Math.pow(10, place);

  const roundedUncVal = Math.round(absUnc / step) * step;
  const roundedVal = Math.round(value / step) * step;

  const decimals = Math.max(0, -place);
  const formattedUncertainty = roundedUncVal.toFixed(decimals);
  const formattedValue = roundedVal.toFixed(decimals);

  const unitStr = unit ? ` ${unit}` : '';
  const combined = `(${formattedValue} ± ${formattedUncertainty})${unitStr}`;

  return {
    formattedValue,
    formattedUncertainty,
    combined,
    decimalPlaces: decimals,
  };
}

/**
 * Safe expression evaluator for user typed computed columns, e.g. "t / 20", "T^2", "1 / R"
 * Supports variables by name/symbol and basic operators +, -, *, /, ^, sqrt, sin, cos, pi.
 */
export function evaluateFormula(formula: string, scope: Record<string, number>): number {
  if (!formula || typeof formula !== 'string') return NaN;
  let expr = formula.trim();

  // Replace symbols/variables with their values
  // Sort keys by length descending to prevent substring collisions (e.g. 'T2' before 'T')
  const keys = Object.keys(scope).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const val = scope[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'g');
      expr = expr.replace(reg, `(${val})`);
    }
  }

  // Replace mathematical constants and functions
  expr = expr.replace(/\bpi\b/gi, `(${Math.PI})`);
  expr = expr.replace(/\bPI\b/g, `(${Math.PI})`);
  expr = expr.replace(/\be\b/g, `(${Math.E})`);
  expr = expr.replace(/\bsqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
  expr = expr.replace(/\bsin\(([^)]+)\)/g, 'Math.sin($1)');
  expr = expr.replace(/\bcos\(([^)]+)\)/g, 'Math.cos($1)');
  expr = expr.replace(/\btan\(([^)]+)\)/g, 'Math.tan($1)');
  expr = expr.replace(/\blog\(([^)]+)\)/g, 'Math.log10($1)');
  expr = expr.replace(/\bln\(([^)]+)\)/g, 'Math.log($1)');
  expr = expr.replace(/\bexp\(([^)]+)\)/g, 'Math.exp($1)');

  // Replace ^ with ** for exponentiation
  expr = expr.replace(/\^/g, '**');

  // Whitelist check to prevent arbitrary execution
  if (!/^[0-9+\-*/().\s,Math.sqrtsincostanlogexpePI*]+$/.test(expr)) {
    return NaN;
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}
