import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Clipboard,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FunctionSquare,
  Sparkles,
} from 'lucide-react';
import { ComputedColumnDef, DataRow, ExperimentConfig, VariableDef } from '../types';
import { evaluateFormula } from '../utils/math';
import { KaTeXView } from './KaTeXView';

interface Step2DataSheetProps {
  config: ExperimentConfig;
  onChangeConfig: (newConfig: ExperimentConfig) => void;
  rows: DataRow[];
  onChangeRows: (newRows: DataRow[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2DataSheet: React.FC<Step2DataSheetProps> = ({
  config,
  onChangeConfig,
  rows,
  onChangeRows,
  onNext,
  onPrev,
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showAddComputedModal, setShowAddComputedModal] = useState(false);

  // New computed column draft state
  const [newColName, setNewColName] = useState('');
  const [newColSymbol, setNewColSymbol] = useState('');
  const [newColFormula, setNewColFormula] = useState('');
  const [newColUnit, setNewColUnit] = useState('');
  const [newColAxis, setNewColAxis] = useState<'x' | 'y' | 'none'>('none');

  // Determine repeat count for each variable across current rows
  const variableRepeatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of config.variables) {
      let maxCount = 1;
      for (const r of rows) {
        const arr = r.readings[v.id] || [];
        if (arr.length > maxCount) maxCount = arr.length;
      }
      counts[v.id] = Math.max(1, maxCount);
    }
    return counts;
  }, [config.variables, rows]);

  // Handle cell value change
  const handleCellChange = (rowId: string, varId: string, trialIndex: number, rawVal: string) => {
    const num = parseFloat(rawVal);
    const val = rawVal.trim() === '' ? NaN : isNaN(num) ? NaN : num;

    const newRows = rows.map((r) => {
      if (r.id !== rowId) return r;
      const currentArr = [...(r.readings[varId] || [])];
      // Ensure array length
      while (currentArr.length <= trialIndex) {
        currentArr.push(NaN);
      }
      currentArr[trialIndex] = val;
      return {
        ...r,
        readings: {
          ...r.readings,
          [varId]: currentArr,
        },
      };
    });

    onChangeRows(newRows);
  };

  const addRow = () => {
    const newId = `row-${Date.now()}`;
    const newReadings: Record<string, number[]> = {};
    for (const v of config.variables) {
      newReadings[v.id] = Array(variableRepeatCounts[v.id] || 1).fill(NaN);
    }
    onChangeRows([...rows, { id: newId, readings: newReadings }]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    onChangeRows(rows.filter((r) => r.id !== rowId));
  };

  const addRepeatTrial = (varId: string) => {
    const newRows = rows.map((r) => {
      const arr = [...(r.readings[varId] || [])];
      arr.push(NaN);
      return {
        ...r,
        readings: { ...r.readings, [varId]: arr },
      };
    });
    onChangeRows(newRows);
  };

  const removeRepeatTrial = (varId: string) => {
    if ((variableRepeatCounts[varId] || 1) <= 1) return;
    const newRows = rows.map((r) => {
      const arr = [...(r.readings[varId] || [])];
      arr.pop();
      return {
        ...r,
        readings: { ...r.readings, [varId]: arr },
      };
    });
    onChangeRows(newRows);
  };

  // Add computed column
  const handleAddComputedColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColSymbol.trim() || !newColFormula.trim()) return;

    const newCol: ComputedColumnDef = {
      id: `computed_${Date.now()}`,
      name: newColName.trim() || newColSymbol.trim(),
      symbol: newColSymbol.trim(),
      formula: newColFormula.trim(),
      unit: newColUnit.trim(),
      axis: newColAxis,
    };

    onChangeConfig({
      ...config,
      computedColumns: [...config.computedColumns, newCol],
    });

    setNewColName('');
    setNewColSymbol('');
    setNewColFormula('');
    setNewColUnit('');
    setNewColAxis('none');
    setShowAddComputedModal(false);
  };

  const removeComputedColumn = (id: string) => {
    onChangeConfig({
      ...config,
      computedColumns: config.computedColumns.filter((c) => c.id !== id),
    });
  };

  // Compute values for a row given variables and formulas
  const computeRowValues = (row: DataRow) => {
    const scope: Record<string, number> = {};

    // 1. Fill variable means
    for (const v of config.variables) {
      const arr = (row.readings[v.id] || []).filter((x) => typeof x === 'number' && !isNaN(x));
      const mean = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
      scope[v.id] = mean;
      scope[v.symbol] = mean;
    }

    // 2. Fill computed columns sequentially
    const computedValues: Record<string, number> = {};
    for (const col of config.computedColumns) {
      const val = evaluateFormula(col.formula, scope);
      computedValues[col.id] = val;
      scope[col.id] = val;
      scope[col.symbol] = val;
    }

    return computedValues;
  };

  // Validate all cells for warnings
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    rows.forEach((r, idx) => {
      for (const v of config.variables) {
        const arr = r.readings[v.id] || [];
        const hasValid = arr.some((x) => typeof x === 'number' && !isNaN(x));
        if (!hasValid) {
          issues.push(`Row ${idx + 1}: Missing readings for "${v.name}" (${v.symbol})`);
        }
      }
    });
    return issues;
  }, [rows, config.variables]);

  // Paste handler
  const handlePasteExecute = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedRows: DataRow[] = [];
    lines.forEach((line, rIdx) => {
      // Split by tab or comma
      const tokens = line.includes('\t') ? line.split('\t') : line.split(/,\s*/);
      const readings: Record<string, number[]> = {};

      let tokenIdx = 0;
      for (const v of config.variables) {
        const repeatCount = variableRepeatCounts[v.id] || 1;
        const vReadings: number[] = [];
        for (let i = 0; i < repeatCount; i++) {
          const raw = tokens[tokenIdx++];
          const val = raw !== undefined ? parseFloat(raw.trim()) : NaN;
          vReadings.push(val);
        }
        readings[v.id] = vReadings;
      }

      parsedRows.push({
        id: `row-paste-${rIdx}-${Date.now()}`,
        readings,
      });
    });

    if (parsedRows.length > 0) {
      onChangeRows(parsedRows);
    }
    setShowPasteModal(false);
    setPasteText('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Step 2: Experimental Data Sheet
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Enter repeated measurement trials. Support for formulas, copy-paste, and instant validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paste from Excel / CSV</span>
          </button>

          <button
            onClick={() => setShowAddComputedModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition cursor-pointer"
          >
            <FunctionSquare className="w-3.5 h-3.5" />
            <span>+ Add Computed Column</span>
          </button>

          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Validation Warnings if any */}
      {validationIssues.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-bold">Missing or non-numerical data detected: </span>
            {validationIssues.slice(0, 3).join('; ')}
            {validationIssues.length > 3 && ` ...and ${validationIssues.length - 3} more.`}
          </div>
        </div>
      )}

      {/* Main Spreadsheet Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Row 1: Variable Group Headers */}
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-300">
                <th className="py-2.5 px-3 w-12 text-center text-slate-500 font-mono">#</th>
                {config.variables.map((v) => {
                  const repeats = variableRepeatCounts[v.id] || 1;
                  return (
                    <th
                      key={v.id}
                      colSpan={repeats}
                      className="py-2 px-3 border-l border-slate-800 text-center"
                    >
                      <div className="flex items-center justify-center gap-1.5 font-bold text-cyan-300">
                        <span>{v.name}</span>
                        <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded text-white">
                          {v.symbol} ({v.unit})
                        </span>
                        {v.axis && v.axis !== 'none' && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                            {v.axis}-axis
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                        <span>LC: ±{v.leastCount} {v.unit}</span>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => addRepeatTrial(v.id)}
                            title="Add another repeat trial column"
                            className="px-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded"
                          >
                            +trial
                          </button>
                          {repeats > 1 && (
                            <button
                              onClick={() => removeRepeatTrial(v.id)}
                              title="Remove repeat trial column"
                              className="px-1 bg-slate-800 hover:bg-slate-700 text-red-400 rounded"
                            >
                              -trial
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Computed Columns Headers */}
                {config.computedColumns.map((c) => (
                  <th
                    key={c.id}
                    className="py-2 px-3 border-l border-slate-800 text-center bg-indigo-950/30"
                  >
                    <div className="flex items-center justify-center gap-1.5 font-bold text-indigo-300">
                      <span>{c.name}</span>
                      <span className="font-mono text-[11px] bg-indigo-900/60 px-1.5 py-0.5 rounded text-white">
                        {c.symbol} ({c.unit})
                      </span>
                      {c.axis && c.axis !== 'none' && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
                          {c.axis}-axis
                        </span>
                      )}
                      <button
                        onClick={() => removeComputedColumn(c.id)}
                        className="text-slate-400 hover:text-red-400 p-0.5"
                        title="Delete column"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-indigo-400/80 mt-0.5">
                      Formula: {c.formula}
                    </div>
                  </th>
                ))}

                <th className="py-2.5 px-3 w-14 text-center border-l border-slate-800">Del</th>
              </tr>

              {/* Row 2: Trial sub-headers */}
              <tr className="bg-slate-900/90 border-b border-slate-700 text-[11px] text-slate-400">
                <th className="py-1 px-3 text-center"></th>
                {config.variables.map((v) => {
                  const repeats = variableRepeatCounts[v.id] || 1;
                  return Array.from({ length: repeats }).map((_, tIdx) => (
                    <th
                      key={`${v.id}-trial-${tIdx}`}
                      className="py-1 px-2 border-l border-slate-800 text-center font-mono"
                    >
                      {repeats > 1 ? `Trial ${tIdx + 1}` : 'Reading'}
                    </th>
                  ));
                })}
                {config.computedColumns.map((c) => (
                  <th
                    key={`computed-sub-${c.id}`}
                    className="py-1 px-2 border-l border-slate-800 text-center font-mono text-indigo-300/80 bg-indigo-950/20"
                  >
                    Calculated
                  </th>
                ))}
                <th className="py-1 px-3 border-l border-slate-800"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 font-mono">
              {rows.map((row, rIdx) => {
                const computed = computeRowValues(row);

                return (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-center text-slate-500 font-semibold">
                      {rIdx + 1}
                    </td>

                    {/* Measured cells */}
                    {config.variables.map((v) => {
                      const repeats = variableRepeatCounts[v.id] || 1;
                      const arr = row.readings[v.id] || [];

                      return Array.from({ length: repeats }).map((_, tIdx) => {
                        const val = arr[tIdx];
                        const isInvalid = val === undefined || isNaN(val);

                        return (
                          <td
                            key={`${v.id}-${tIdx}`}
                            className="py-1 px-1.5 border-l border-slate-800"
                          >
                            <input
                              type="number"
                              step="any"
                              value={isNaN(val) ? '' : val}
                              onChange={(e) =>
                                handleCellChange(row.id, v.id, tIdx, e.target.value)
                              }
                              placeholder="0.00"
                              className={`w-full text-center py-1.5 px-1 rounded-lg text-xs transition focus:outline-none ${
                                isInvalid
                                  ? 'bg-amber-950/30 border border-amber-700/60 text-amber-200'
                                  : 'bg-slate-900/90 border border-slate-700 text-white focus:border-cyan-500'
                              }`}
                            />
                          </td>
                        );
                      });
                    })}

                    {/* Computed cells (read-only) */}
                    {config.computedColumns.map((c) => {
                      const val = computed[c.id];
                      const formatted = Number.isFinite(val) ? val.toPrecision(4) : '—';

                      return (
                        <td
                          key={`computed-${c.id}`}
                          className="py-1.5 px-2 border-l border-slate-800 text-center font-semibold text-indigo-200 bg-indigo-950/20"
                        >
                          {formatted}
                        </td>
                      );
                    })}

                    {/* Row delete */}
                    <td className="py-1 px-2 border-l border-slate-800 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        className={`p-1.5 rounded transition ${
                          rows.length <= 1
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-400 cursor-pointer'
                        }`}
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-cyan-400" />
              Paste Data from Excel / Google Sheets
            </h3>
            <p className="text-xs text-slate-300">
              Paste rows copied directly from Excel or a CSV file. Each row should contain values matching the order of your table columns.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="e.g.&#10;0.20&#9;17.92&#9;18.05&#9;17.88&#10;0.30&#9;22.02&#9;22.18&#9;21.95"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteExecute}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Insert Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Computed Column Modal */}
      {showAddComputedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddComputedColumn}
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FunctionSquare className="w-4 h-4 text-indigo-400" />
              Add Computed (Derived) Column
            </h3>
            <p className="text-xs text-slate-300">
              Calculate derived physical quantities such as period $T = t / 20$, $T^2$, or inverse resistance $1/R$.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g., Period Squared"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={newColSymbol}
                    onChange={(e) => setNewColSymbol(e.target.value)}
                    placeholder="e.g., T^2"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newColUnit}
                    onChange={(e) => setNewColUnit(e.target.value)}
                    placeholder="e.g., s^2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Formula (using variable symbols or names)
                </label>
                <input
                  type="text"
                  value={newColFormula}
                  onChange={(e) => setNewColFormula(e.target.value)}
                  placeholder="e.g., T^2 or t20 / 20 or 1/R"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available tokens:{' '}
                  {config.variables.map((v) => v.symbol).join(', ')}
                  {config.computedColumns.map((c) => `, ${c.symbol}`)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Graph Axis Assignment
                </label>
                <select
                  value={newColAxis}
                  onChange={(e) => setNewColAxis(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="none">None (Intermediate Column)</option>
                  <option value="x">X-Axis</option>
                  <option value="y">Y-Axis</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddComputedModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Add Column
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back: Setup</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
        >
          <span>Continue to Step 3: Uncertainty Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
