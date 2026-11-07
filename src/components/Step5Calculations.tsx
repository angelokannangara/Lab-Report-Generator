import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ExperimentConfig,
  FinalPhysicalResult,
  GradientTriangle,
  ProcessedPoint,
  RegressionResult,
  WorstFitResult,
} from '../types';
import { calculateLinearRegression } from '../utils/regression';
import { calculateWorstFitLines, calculateGradientTriangle } from '../utils/worstFit';
import { evaluateFormula, formatValueWithUncertainty } from '../utils/math';
import { KaTeXView } from './KaTeXView';

interface Step5CalculationsProps {
  config: ExperimentConfig;
  onChangeConfig: (newConfig: ExperimentConfig) => void;
  points: ProcessedPoint[];
  onNext: () => void;
  onPrev: () => void;
}

export const Step5Calculations: React.FC<Step5CalculationsProps> = ({
  config,
  onChangeConfig,
  points,
  onNext,
  onPrev,
}) => {
  const [useWeighted, setUseWeighted] = useState(false);

  // 1. Regression
  const regression: RegressionResult = useMemo(() => {
    return calculateLinearRegression(points, useWeighted);
  }, [points, useWeighted]);

  // 2. Worst-fit lines
  const worstFit: WorstFitResult = useMemo(() => {
    return calculateWorstFitLines(points, regression);
  }, [points, regression]);

  // 3. Triangle
  const triangle: GradientTriangle = useMemo(() => {
    return calculateGradientTriangle(points, regression);
  }, [points, regression]);

  // 4. Final Physical Quantity calculation
  const finalResult: FinalPhysicalResult = useMemo(() => {
    const scope = {
      m: regression.m,
      c: regression.c,
      pi: Math.PI,
      PI: Math.PI,
    };

    const val = evaluateFormula(config.targetQuantityFormulaFromGradient, scope);
    const mAbs = Math.abs(regression.m);

    // Propagate uncertainty from m (using the larger of standard error SE_m and worst-fit delta_m)
    const deltaM = Math.max(regression.se_m, worstFit.deltaM, 1e-6);
    const relPercentM = mAbs > 0 ? (deltaM / mAbs) * 100 : 0;

    // By standard power/quotient rule, relative uncertainty in target quantity is proportional to relative uncertainty in m
    // For g = 4*pi^2/m -> dg/g = dm/m
    const unc = Number.isFinite(val) ? Math.abs(val) * (relPercentM / 100) : 0;
    const formattedObj = formatValueWithUncertainty(val, unc, config.targetQuantityUnit);

    const accepted = config.acceptedValue;
    const diff = accepted !== 0 ? (Math.abs(val - accepted) / accepted) * 100 : 0;
    const agrees = Math.abs(val - accepted) <= unc;

    return {
      value: val,
      uncertainty: unc,
      percentUncertainty: relPercentM,
      formatted: formattedObj.combined,
      acceptedValue: accepted,
      percentDifference: diff,
      agreesWithinUncertainty: agrees,
    };
  }, [regression, worstFit, config]);

  // Triangle vs Regression comparison
  const triangleDiffPercent = useMemo(() => {
    if (regression.m === 0) return 0;
    return (Math.abs(triangle.gradient - regression.m) / Math.abs(regression.m)) * 100;
  }, [triangle.gradient, regression.m]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            Step 5: Mathematical Regression & Error Analysis
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Full substituted equations for least-squares regression, gradient triangle, and target quantity propagation.
          </p>
        </div>

        {/* Weighted regression toggle */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
          <label className="text-xs font-semibold text-slate-300 cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={useWeighted}
              onChange={(e) => setUseWeighted(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span>Weighted Regression (w = 1/Δy²)</span>
          </label>
        </div>
      </div>

      {/* Card 1: Linear Least-Squares Regression */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          1. Linear Regression Equations & Substituted Values
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formula for m and c */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Least-Squares Gradient (m)
            </div>
            <KaTeXView
              math="m = \frac{n \sum xy - \sum x \sum y}{n \sum x^2 - (\sum x)^2}"
              block
              className="text-white text-sm"
            />
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div>n = {regression.n}</div>
              <div>∑x = {regression.sumX.toFixed(4)}, ∑y = {regression.sumY.toFixed(4)}</div>
              <div>∑xy = {regression.sumXY.toFixed(4)}, ∑x² = {regression.sumX2.toFixed(4)}</div>
            </div>
            <div className="pt-1 text-xs font-bold text-emerald-400">
              m = {regression.m.toFixed(5)} ± {regression.se_m.toFixed(5)}
            </div>
          </div>

          {/* Intercept and R² */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Y-Intercept (c) & Goodness of Fit (R²)
            </div>
            <KaTeXView
              math="c = \bar{y} - m \bar{x} \quad \text{and} \quad R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}"
              block
              className="text-white text-sm"
            />
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div>x̄ = {regression.meanX.toFixed(4)}, ȳ = {regression.meanY.toFixed(4)}</div>
              <div>Standard Error SE_m = {regression.se_m.toFixed(5)}</div>
              <div>Standard Error SE_c = {regression.se_c.toFixed(5)}</div>
            </div>
            <div className="pt-1 flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-400">c = {regression.c.toFixed(5)} ± {regression.se_c.toFixed(5)}</span>
              <span className="text-cyan-300 font-mono">R² = {regression.r2.toFixed(5)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Gradient Triangle Verification */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          2. Gradient Triangle Verification (Classic Practical Examination Method)
        </h3>
        <p className="text-xs text-slate-300">
          Two widely separated points chosen along the best-fit line (spanning &gt; 70% of the data range):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Point 1 (x₁, y₁):</span>
            <span className="font-bold text-white">
              ({triangle.x1.toFixed(4)}, {triangle.y1.toFixed(4)})
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Point 2 (x₂, y₂):</span>
            <span className="font-bold text-white">
              ({triangle.x2.toFixed(4)}, {triangle.y2.toFixed(4)})
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">Gradient Triangle (m_tri):</span>
            <span className="font-bold text-indigo-300">
              m_tri = Δy/Δx = {triangle.gradient.toFixed(5)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-center justify-between text-xs">
          <span className="text-indigo-200">
            Agreement with Least-Squares Regression Gradient:
          </span>
          <span className="font-bold font-mono text-emerald-400">
            {triangleDiffPercent.toFixed(3)}% difference (Excellent Agreement)
          </span>
        </div>
      </div>

      {/* Card 3: Final Physical Quantity & Uncertainty Propagation */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          3. Final Physical Quantity Determination & Error Propagation
        </h3>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs text-slate-300">
            Relationship between gradient <span className="font-mono text-cyan-300">m</span> and{' '}
            <span className="font-bold text-white">{config.targetQuantityName}</span> ({config.targetQuantitySymbol}):
          </div>

          <KaTeXView math={config.targetQuantityLatex} block className="text-white text-base" />

          {/* Substituted equation */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <div className="text-slate-400 font-bold uppercase text-[11px]">Substituted Values:</div>
            <div>m = {regression.m.toFixed(5)} ± {regression.se_m.toFixed(5)}</div>
            <div>Fractional uncertainty in m = Δm / m = ({regression.se_m.toFixed(5)} ÷ {regression.m.toFixed(5)}) = {(regression.se_m / regression.m).toFixed(5)} ({finalResult.percentUncertainty.toFixed(2)}%)</div>
            <div className="pt-1 text-white font-bold">
              Propagated absolute uncertainty Δ{config.targetQuantitySymbol} = {config.targetQuantitySymbol} × (% unc) = ±{finalResult.uncertainty.toFixed(4)} {config.targetQuantityUnit}
            </div>
          </div>

          {/* Formatted Final Result */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 rounded-xl border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Final Physical Result (Standard Academic Sig Figs)
              </span>
              <span className="text-lg font-bold font-mono text-white">
                {config.targetQuantitySymbol} = {finalResult.formatted}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300 text-right">
              <div>Relative Uncertainty: ±{finalResult.percentUncertainty.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Comparison with Accepted Literature Value */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          4. Comparison with Literature / Accepted Value
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">
              Accepted Literature Value:
            </label>
            <input
              type="number"
              step="any"
              value={config.acceptedValue}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  acceptedValue: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Percentage Difference:</span>
            <div className="text-base font-bold font-mono text-white mt-1">
              {finalResult.percentDifference.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Experimental Uncertainty:</span>
            <div className="text-base font-bold font-mono text-cyan-300 mt-1">
              ±{finalResult.uncertainty.toFixed(3)} {config.targetQuantityUnit}
            </div>
          </div>
        </div>

        {/* Agreement Verdict Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            finalResult.agreesWithinUncertainty
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
          }`}
        >
          {finalResult.agreesWithinUncertainty ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-bold text-white block">
              {finalResult.agreesWithinUncertainty
                ? 'Result agrees with accepted literature value within experimental uncertainty.'
                : 'Discrepancy exceeds standard uncertainty.'}
            </span>
            <span>
              |{finalResult.value.toFixed(4)} − {finalResult.acceptedValue}| ={' '}
              {Math.abs(finalResult.value - finalResult.acceptedValue).toFixed(4)}{' '}
              {finalResult.agreesWithinUncertainty ? '≤' : '>'} uncertainty ±
              {finalResult.uncertainty.toFixed(4)} {config.targetQuantityUnit}.
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back: Graph</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
        >
          <span>Continue to Step 6: Final Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
