import test from 'node:test';
import assert from 'node:assert/strict';
import { toSignificantFigures, formatValueWithUncertainty, evaluateFormula } from './math';
import { calculateRepeatStats, propagateColumnUncertainty } from './uncertainty';
import { calculateLinearRegression } from './regression';
import { roundUpToNiceScale, calculateGridScale } from './scale';
import { calculateWorstFitLines, calculateGradientTriangle } from './worstFit';
import { ProcessedPoint } from '../types';

test('Significant figures formatting and rules', () => {
  // Test 1: Uncertainty starting with 1 has 2 sig figs; others have 1 sig fig
  const r1 = formatValueWithUncertainty(9.8145, 0.142, 'm s^-2');
  assert.equal(r1.formattedUncertainty, '0.14');
  assert.equal(r1.formattedValue, '9.81');

  const r2 = formatValueWithUncertainty(9.8145, 0.082, 'm s^-2');
  assert.equal(r2.formattedUncertainty, '0.08');
  assert.equal(r2.formattedValue, '9.81');

  const r3 = formatValueWithUncertainty(152.3, 18.2, 'N');
  assert.equal(r3.formattedUncertainty, '18');
  assert.equal(r3.formattedValue, '152');

  const r4 = formatValueWithUncertainty(152.3, 35.1, 'N');
  assert.equal(r4.formattedUncertainty, '40');
  assert.equal(r4.formattedValue, '150');
});

test('Formula evaluation', () => {
  const scope = { t: 20.4, T: 1.02, L: 0.5 };
  assert.equal(evaluateFormula('t / 20', scope), 1.02);
  assert.ok(Math.abs(evaluateFormula('T^2', scope) - 1.0404) < 1e-6);
  assert.ok(Math.abs(evaluateFormula('4 * pi^2 * L / (T^2)', scope) - (4 * Math.PI * Math.PI * 0.5) / 1.0404) < 1e-4);
});

test('Repeat readings statistics and uncertainty calculation', () => {
  const readings = [20.1, 20.3, 20.2];
  const stats = calculateRepeatStats(readings, 0.01, 'half_range');
  assert.equal(stats.count, 3);
  assert.ok(Math.abs(stats.mean - 20.2) < 1e-6);
  assert.ok(Math.abs(stats.range - 0.2) < 1e-6);
  assert.ok(Math.abs(stats.halfRange - 0.1) < 1e-6);
  // Half range (0.1) is larger than least count (0.01), so uncertainty is 0.1
  assert.ok(Math.abs(stats.absoluteUncertainty - 0.1) < 1e-6);

  // When spread is smaller than least count
  const identical = [20.0, 20.0, 20.0];
  const statsIdentical = calculateRepeatStats(identical, 0.05, 'half_range');
  assert.equal(statsIdentical.absoluteUncertainty, 0.05);
});

test('Uncertainty propagation rules', () => {
  // Constant divisor rule: T = t / 20 where t = 20.0 ± 0.2
  const vars = { t: { value: 20.0, uncertainty: 0.2 } };
  const p1 = propagateColumnUncertainty('t / 20', vars, 1.0);
  assert.ok(Math.abs(p1.uncertainty - 0.01) < 1e-6);

  // Power rule: T^2 where T = 1.00 ± 0.02
  const varsT = { T: { value: 1.00, uncertainty: 0.02 } };
  const p2 = propagateColumnUncertainty('T^2', varsT, 1.00);
  // Δ(T^2) / T^2 = 2 * (0.02 / 1.00) = 0.04 => Δ(T^2) = 0.04
  assert.ok(Math.abs(p2.uncertainty - 0.04) < 1e-6);
});

test('Linear regression with known textbook data', () => {
  // Points: (1, 2), (2, 4), (3, 6), (4, 8) -> m = 2, c = 0, R^2 = 1.0
  const points: ProcessedPoint[] = [
    { index: 0, rawRowId: '1', x: 1, y: 2, dx: 0.05, dy: 0.1, xRelPercent: 5, yRelPercent: 5 },
    { index: 1, rawRowId: '2', x: 2, y: 4, dx: 0.05, dy: 0.1, xRelPercent: 2.5, yRelPercent: 2.5 },
    { index: 2, rawRowId: '3', x: 3, y: 6, dx: 0.05, dy: 0.1, xRelPercent: 1.7, yRelPercent: 1.7 },
    { index: 3, rawRowId: '4', x: 4, y: 8, dx: 0.05, dy: 0.1, xRelPercent: 1.25, yRelPercent: 1.25 },
  ];

  const reg = calculateLinearRegression(points, false);
  assert.ok(Math.abs(reg.m - 2.0) < 1e-6);
  assert.ok(Math.abs(reg.c - 0.0) < 1e-6);
  assert.ok(Math.abs(reg.r2 - 1.0) < 1e-6);
  assert.equal(reg.meanX, 2.5);
  assert.equal(reg.meanY, 5.0);
});

test('Scale rounding and 180mm x 250mm grid calculation', () => {
  // Raw 0.007 per mm -> rounds up to 0.01 (1 * 10^-2)
  assert.equal(roundUpToNiceScale(0.007), 0.01);
  // Raw 0.018 per mm -> rounds up to 0.02 (2 * 10^-2)
  assert.equal(roundUpToNiceScale(0.018), 0.02);
  // Raw 0.035 per mm -> rounds up to 0.05 (5 * 10^-2)
  assert.equal(roundUpToNiceScale(0.035), 0.05);
  // Raw 0.065 per mm -> rounds up to 0.1 (10 * 10^-2)
  assert.equal(roundUpToNiceScale(0.065), 0.1);

  const points: ProcessedPoint[] = [
    { index: 0, rawRowId: '1', x: 0.2, y: 0.8, dx: 0.01, dy: 0.02, xRelPercent: 5, yRelPercent: 2.5 },
    { index: 1, rawRowId: '2', x: 0.8, y: 3.2, dx: 0.01, dy: 0.02, xRelPercent: 1.25, yRelPercent: 0.6 },
  ];

  const scale = calculateGridScale(points, true, 180, 250);
  assert.equal(scale.widthMm, 180);
  assert.equal(scale.heightMm, 250);
  assert.ok(scale.xMax >= 0.8);
  assert.ok(scale.yMax >= 3.2);
});

test('Worst-fit lines and gradient triangle edge cases', () => {
  const points: ProcessedPoint[] = [
    { index: 0, rawRowId: '1', x: 1, y: 2, dx: 0.1, dy: 0.2, xRelPercent: 10, yRelPercent: 10 },
    { index: 1, rawRowId: '2', x: 2, y: 4, dx: 0.1, dy: 0.2, xRelPercent: 5, yRelPercent: 5 },
    { index: 2, rawRowId: '3', x: 3, y: 6, dx: 0.1, dy: 0.2, xRelPercent: 3.3, yRelPercent: 3.3 },
  ];
  const reg = calculateLinearRegression(points, false);
  const worstFit = calculateWorstFitLines(points, reg);

  assert.ok(worstFit.maxLine.m >= reg.m, 'm_max should be >= reg.m');
  assert.ok(worstFit.minLine.m <= reg.m, 'm_min should be <= reg.m');
  assert.ok(worstFit.deltaM > 0, 'deltaM should be positive');

  const triangle = calculateGradientTriangle(points, reg);
  assert.ok(triangle.dx > 0.5 * (3 - 1), 'Triangle dx should span > 50% of range');
  assert.ok(Math.abs(triangle.gradient - reg.m) < 1e-4, 'Triangle gradient matches regression gradient');
});
