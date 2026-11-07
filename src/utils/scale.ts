import { GridScale, ProcessedPoint } from '../types';

/**
 * Rounds raw value per 1 mm square UP to a standard physics scale:
 * 1, 2, or 5 * 10^n.
 */
export function roundUpToNiceScale(rawPerMm: number): number {
  if (rawPerMm <= 0 || !Number.isFinite(rawPerMm)) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(rawPerMm));
  const fraction = rawPerMm / Math.pow(10, exponent);

  let niceFraction = 1;
  if (fraction <= 1.00000001) {
    niceFraction = 1;
  } else if (fraction <= 2.00000001) {
    niceFraction = 2;
  } else if (fraction <= 5.00000001) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

/**
 * Formats a numeric value neatly for axis labels (handling tiny/large exponents gracefully).
 */
export function formatAxisNumber(val: number): string {
  if (Math.abs(val) < 1e-9) return '0';
  const abs = Math.abs(val);
  if (abs >= 0.01 && abs < 10000) {
    // Up to 3 decimal places without trailing zeroes
    return parseFloat(val.toFixed(3)).toString();
  }
  return val.toExponential(1).replace('e+', 'e');
}

/**
 * Calculate the 180 mm x 250 mm millimetre grid layout and scale.
 */
export function calculateGridScale(
  points: ProcessedPoint[],
  startAtZero: boolean = true,
  customWidthMm: number = 180,
  customHeightMm: number = 250
): GridScale {
  const widthMm = customWidthMm;
  const heightMm = customHeightMm;

  if (points.length === 0) {
    return {
      xMin: 0,
      xMax: 10,
      yMin: 0,
      yMax: 10,
      xSpan: 10,
      ySpan: 10,
      xRawPerMm: 10 / widthMm,
      yRawPerMm: 10 / heightMm,
      xScalePerMm: roundUpToNiceScale(10 / widthMm),
      yScalePerMm: roundUpToNiceScale(10 / heightMm),
      xUnitsPerCm: roundUpToNiceScale(10 / widthMm) * 10,
      yUnitsPerCm: roundUpToNiceScale(10 / heightMm) * 10,
      xMajorInterval: roundUpToNiceScale(10 / widthMm) * 10,
      yMajorInterval: roundUpToNiceScale(10 / heightMm) * 10,
      xTicks: [],
      yTicks: [],
      widthMm,
      heightMm,
    };
  }

  // Account for error bars in range
  const xValuesMin = points.map((p) => p.x - (p.dx || 0));
  const xValuesMax = points.map((p) => p.x + (p.dx || 0));
  const yValuesMin = points.map((p) => p.y - (p.dy || 0));
  const yValuesMax = points.map((p) => p.y + (p.dy || 0));

  let rawXMin = Math.min(...xValuesMin);
  let rawXMax = Math.max(...xValuesMax);
  let rawYMin = Math.min(...yValuesMin);
  let rawYMax = Math.max(...yValuesMax);

  if (startAtZero) {
    rawXMin = Math.min(0, rawXMin);
    rawYMin = Math.min(0, rawYMin);
  }

  // Avoid zero range
  if (rawXMax <= rawXMin) rawXMax = rawXMin + 1;
  if (rawYMax <= rawYMin) rawYMax = rawYMin + 1;

  const rawXSpan = rawXMax - rawXMin;
  const rawYSpan = rawYMax - rawYMin;

  const xRawPerMm = rawXSpan / widthMm;
  const yRawPerMm = rawYSpan / heightMm;

  const xScalePerMm = roundUpToNiceScale(xRawPerMm);
  const yScalePerMm = roundUpToNiceScale(yRawPerMm);

  const xUnitsPerCm = xScalePerMm * 10;
  const yUnitsPerCm = yScalePerMm * 10;

  // Nice origin rounding
  const xOrigin = startAtZero && rawXMin >= 0 ? 0 : Math.floor(rawXMin / xUnitsPerCm) * xUnitsPerCm;
  const yOrigin = startAtZero && rawYMin >= 0 ? 0 : Math.floor(rawYMin / yUnitsPerCm) * yUnitsPerCm;

  const xMax = xOrigin + xScalePerMm * widthMm;
  const yMax = yOrigin + yScalePerMm * heightMm;

  // Generate tick marks every 10 mm (1 cm) or 20 mm (2 cm)
  const xTicks: { value: number; mm: number; label: string }[] = [];
  const yTicks: { value: number; mm: number; label: string }[] = [];

  // Ticks at each 10 mm
  for (let mm = 0; mm <= widthMm; mm += 10) {
    const value = xOrigin + mm * xScalePerMm;
    // Show labels every 20 mm if densely spaced, or 10 mm
    const showLabel = mm % 20 === 0 || widthMm <= 100;
    xTicks.push({
      value,
      mm,
      label: showLabel ? formatAxisNumber(value) : '',
    });
  }

  for (let mm = 0; mm <= heightMm; mm += 10) {
    const value = yOrigin + mm * yScalePerMm;
    const showLabel = mm % 20 === 0 || heightMm <= 100;
    yTicks.push({
      value,
      mm,
      label: showLabel ? formatAxisNumber(value) : '',
    });
  }

  return {
    xMin: xOrigin,
    xMax,
    yMin: yOrigin,
    yMax,
    xSpan: xMax - xOrigin,
    ySpan: yMax - yOrigin,
    xRawPerMm,
    yRawPerMm,
    xScalePerMm,
    yScalePerMm,
    xUnitsPerCm,
    yUnitsPerCm,
    xMajorInterval: xUnitsPerCm,
    yMajorInterval: yUnitsPerCm,
    xTicks,
    yTicks,
    widthMm,
    heightMm,
  };
}
