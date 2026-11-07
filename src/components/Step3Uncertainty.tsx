import React from 'react';
import { Percent, ArrowRight, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { DataRow, ExperimentConfig, UncertaintyMethod } from '../types';
import { calculateRepeatStats, propagateColumnUncertainty } from '../utils/uncertainty';
import { formatValueWithUncertainty, evaluateFormula } from '../utils/math';
import { KaTeXView } from './KaTeXView';

interface Step3UncertaintyProps {
  config: ExperimentConfig;
  onChangeConfig: (newConfig: ExperimentConfig) => void;
  rows: DataRow[];
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Uncertainty: React.FC<Step3UncertaintyProps> = ({
  config,
  onChangeConfig,
  rows,
  onNext,
  onPrev,
}) => {
  const handleMethodChange = (method: UncertaintyMethod) => {
    onChangeConfig({
      ...config,
      uncertaintyMethod: method,
    });
  };

  // Compute stats for all rows and all variables
  // rowStats[rowIndex][varId] = RepeatStats
  const rowMeasuredStats = rows.map((r) => {
    const statsByVar: Record<string, ReturnType<typeof calculateRepeatStats>> = {};
    for (const v of config.variables) {
      const arr = r.readings[v.id] || [];
      statsByVar[v.id] = calculateRepeatStats(arr, v.leastCount, config.uncertaintyMethod);
    }
    return statsByVar;
  });

  // Derived column stats for all rows
  const rowDerivedStats = rows.map((r, rIdx) => {
    const measured = rowMeasuredStats[rIdx];
    const scope: Record<string, number> = {};
    const varMap: Record<string, { value: number; uncertainty: number }> = {};

    for (const v of config.variables) {
      const s = measured[v.id];
      scope[v.id] = s.mean;
      scope[v.symbol] = s.mean;
      varMap[v.id] = { value: s.mean, uncertainty: s.absoluteUncertainty };
      varMap[v.symbol] = { value: s.mean, uncertainty: s.absoluteUncertainty };
    }

    const derivedByCol: Record<
      string,
      {
        value: number;
        uncertainty: number;
        percentageUncertainty: number;
        ruleExplanation: string;
      }
    > = {};

    for (const c of config.computedColumns) {
      const derivedVal = evaluateFormula(c.formula, scope);
      const prop = propagateColumnUncertainty(c.formula, varMap, derivedVal);

      derivedByCol[c.id] = {
        value: derivedVal,
        uncertainty: prop.uncertainty,
        percentageUncertainty: prop.percentageUncertainty,
        ruleExplanation: prop.ruleExplanation,
      };

      scope[c.id] = derivedVal;
      scope[c.symbol] = derivedVal;
      varMap[c.id] = { value: derivedVal, uncertainty: prop.uncertainty };
      varMap[c.symbol] = { value: derivedVal, uncertainty: prop.uncertainty };
    }

    return derivedByCol;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Method selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-cyan-400" />
            Step 3: Uncertainty Analysis & Error Propagation
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Statistical means, instrument resolutions, and partial-derivative error propagation rules.
          </p>
        </div>

        {/* Method Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
          <label className="text-xs font-semibold text-slate-400">Uncertainty Method:</label>
          <select
            value={config.uncertaintyMethod}
            onChange={(e) => handleMethodChange(e.target.value as UncertaintyMethod)}
            className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer"
          >
            <option value="half_range" className="bg-slate-800 text-white">
              Max(Least Count, Half-Range Δ/2)
            </option>
            <option value="std_error" className="bg-slate-800 text-white">
              Max(Least Count, Standard Error s/√N)
            </option>
            <option value="least_count_only" className="bg-slate-800 text-white">
              Least Count Only (Instrument Limit)
            </option>
          </select>
        </div>
      </div>

      {/* Physics Rule Note */}
      <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-200/90 leading-relaxed">
          <span className="font-bold text-white">Academic Significant Figures Convention: </span>
          Uncertainties are formatted to <span className="underline">1 significant figure</span> (or{' '}
          <span className="underline">2 significant figures</span> if the leading digit is 1). The
          measured or derived value is then strictly rounded to match the decimal place of that
          uncertainty.
        </div>
      </div>

      {/* Table 1: Measured Variables Summary */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden space-y-3 p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Measured Variables: Means & Absolute/Percentage Uncertainties
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase text-[11px] tracking-wider">
                <th className="py-2 px-3 text-center w-12">#</th>
                <th className="py-2 px-3">Variable</th>
                <th className="py-2 px-3 text-center">N</th>
                <th className="py-2 px-3 text-center">Mean (x̄)</th>
                <th className="py-2 px-3 text-center">Least Count</th>
                <th className="py-2 px-3 text-center">Spread (Half-Range / SE)</th>
                <th className="py-2 px-3 text-center">Abs Uncertainty (Δx)</th>
                <th className="py-2 px-3 text-center">% Uncertainty</th>
                <th className="py-2 px-3 text-right">Standard Representation (x̄ ± Δx)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {rows.map((row, rIdx) => {
                const stats = rowMeasuredStats[rIdx];

                return config.variables.map((v, vIdx) => {
                  const s = stats[v.id];
                  const spreadVal =
                    config.uncertaintyMethod === 'std_error'
                      ? `SE = ${s.stdError.toPrecision(2)}`
                      : `Range/2 = ${s.halfRange.toPrecision(2)}`;
                  const formatted = formatValueWithUncertainty(
                    s.mean,
                    s.absoluteUncertainty,
                    v.unit
                  );

                  return (
                    <tr
                      key={`${row.id}-${v.id}`}
                      className="hover:bg-slate-800/40 transition"
                    >
                      {vIdx === 0 ? (
                        <td
                          rowSpan={config.variables.length}
                          className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-800 bg-slate-900/40"
                        >
                          {rIdx + 1}
                        </td>
                      ) : null}
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {v.name} ({v.symbol})
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">{s.count}</td>
                      <td className="py-2 px-3 text-center font-bold text-white">
                        {s.mean.toPrecision(4)} {v.unit}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">
                        ±{v.leastCount} {v.unit}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                        {s.count > 1 ? spreadVal : 'Single trial'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-amber-300">
                        ±{s.absoluteUncertainty.toPrecision(2)} {v.unit}
                      </td>
                      <td className="py-2 px-3 text-center text-cyan-300 font-semibold">
                        {s.percentageUncertainty.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                        {formatted.combined}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Derived Columns Uncertainty Propagation */}
      {config.computedColumns.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden space-y-3 p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Derived (Computed) Quantities: Error Propagation Working
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase text-[11px] tracking-wider">
                  <th className="py-2 px-3 text-center w-12">#</th>
                  <th className="py-2 px-3">Derived Column</th>
                  <th className="py-2 px-3 text-center">Value</th>
                  <th className="py-2 px-3 text-center">Propagated Uncertainty (Δz)</th>
                  <th className="py-2 px-3 text-center">% Uncertainty</th>
                  <th className="py-2 px-3 text-center">Propagation Formula Applied</th>
                  <th className="py-2 px-3 text-right">Standard Representation (z ± Δz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {rows.map((row, rIdx) => {
                  const derived = rowDerivedStats[rIdx];

                  return config.computedColumns.map((c, cIdx) => {
                    const d = derived[c.id];
                    const formatted = formatValueWithUncertainty(d.value, d.uncertainty, c.unit);

                    return (
                      <tr
                        key={`${row.id}-derived-${c.id}`}
                        className="hover:bg-slate-800/40 transition"
                      >
                        {cIdx === 0 ? (
                          <td
                            rowSpan={config.computedColumns.length}
                            className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-800 bg-slate-900/40"
                          >
                            {rIdx + 1}
                          </td>
                        ) : null}
                        <td className="py-2 px-3 font-semibold text-indigo-300">
                          {c.name} ({c.symbol})
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-white">
                          {d.value.toPrecision(4)} {c.unit}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-300">
                          ±{d.uncertainty.toPrecision(2)} {c.unit}
                        </td>
                        <td className="py-2 px-3 text-center text-cyan-300 font-semibold">
                          {d.percentageUncertainty.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center font-sans text-xs text-slate-300">
                          <KaTeXView math={d.ruleExplanation} className="text-slate-300 text-xs" />
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400">
                          {formatted.combined}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back: Data Sheet</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
        >
          <span>Continue to Step 4: Graph Paper</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
