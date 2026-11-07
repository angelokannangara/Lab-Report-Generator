import React, { useState } from 'react';
import { Plus, Trash2, Sliders, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import { ExperimentConfig, VariableDef } from '../types';
import { KaTeXView } from './KaTeXView';
import { PRESETS } from '../utils/presets';

interface Step1SetupProps {
  config: ExperimentConfig;
  onChangeConfig: (newConfig: ExperimentConfig) => void;
  onApplyPreset: (presetKey: string) => void;
  onNext: () => void;
}

export const Step1Setup: React.FC<Step1SetupProps> = ({
  config,
  onChangeConfig,
  onApplyPreset,
  onNext,
}) => {
  const [newApparatus, setNewApparatus] = useState('');

  const updateField = <K extends keyof ExperimentConfig>(field: K, value: ExperimentConfig[K]) => {
    onChangeConfig({
      ...config,
      [field]: value,
    });
  };

  const addApparatusItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newApparatus.trim()) return;
    updateField('apparatus', [...config.apparatus, newApparatus.trim()]);
    setNewApparatus('');
  };

  const removeApparatusItem = (index: number) => {
    updateField('apparatus', config.apparatus.filter((_, i) => i !== index));
  };

  const updateVariable = (id: string, updates: Partial<VariableDef>) => {
    const updated = config.variables.map((v) => (v.id === id ? { ...v, ...updates } : v));
    updateField('variables', updated);
  };

  const addVariable = () => {
    const newId = `var_${Date.now()}`;
    const newVar: VariableDef = {
      id: newId,
      name: 'New Variable',
      symbol: 'x',
      unit: 'm',
      instrument: 'Metre Rule',
      leastCount: 0.001,
      axis: 'none',
    };
    updateField('variables', [...config.variables, newVar]);
  };

  const removeVariable = (id: string) => {
    updateField('variables', config.variables.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner & Preset bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Step 1: Experiment Setup & Physics Theory
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Define the physical laws, linear model y = mx + c, instruments, least counts, and target quantity.
            </p>
          </div>
          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Presets:
            </span>
            {Object.keys(PRESETS).map((key) => {
              const p = PRESETS[key];
              const isSelected = config.id === p.config.id;
              const labelMap: Record<string, string> = {
                simple_pendulum: 'Pendulum (g)',
                exp01_refractive_indices: 'Exp 01: Refraction (μ)',
                exp02_stokes_viscosity: "Exp 02: Stoke's (η)",
                resistivity_wire: 'Exp 03: Metre Bridge (ρ)',
                exp05_deflection_magnetometer: 'Exp 05: Magnetometer',
                exp07_voltage_regulation: 'Exp 07: Zener Diode',
                exp08_op_amp: 'Exp 08: OP-AMP 741',
                exp09_bifilar_suspension: 'Exp 09: Bifilar (I)',
                exp10_plancks_constant: 'Exp 10: Planck (h)',
                exp10b_boltzmann_constant: 'Exp 10B: Boltzmann (k)',
                hookes_law: "Hooke's Law (k)",
                ohms_law: "Ohm's Law (R)",
                youngs_modulus: "Young's Mod (Y)",
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onApplyPreset(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {labelMap[key] || p.config.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Title, Aim, Apparatus */}
        <div className="space-y-4">
          {/* Title */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
              Experiment Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500"
              placeholder="e.g., Determination of Acceleration Due to Gravity (g) Using a Simple Pendulum"
            />

            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block pt-1">
              Aim of Experiment
            </label>
            <textarea
              rows={3}
              value={config.aim}
              onChange={(e) => updateField('aim', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
              placeholder="State the scientific purpose and expected outcome..."
            />
          </div>

          {/* Apparatus */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Apparatus List ({config.apparatus.length})
              </label>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {config.apparatus.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                    {item}
                  </span>
                  <button
                    onClick={() => removeApparatusItem(idx)}
                    className="text-slate-400 hover:text-red-400 p-1 transition cursor-pointer"
                    aria-label={`Remove apparatus ${item}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addApparatusItem} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newApparatus}
                onChange={(e) => setNewApparatus(e.target.value)}
                placeholder="Add equipment (e.g., Vernier caliper ±0.05 mm)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Theoretical Equation, Linear Form & Physical Meaning */}
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
              Theoretical Governing Equation
            </label>
            <input
              type="text"
              value={config.theoreticalEquation}
              onChange={(e) => updateField('theoreticalEquation', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              placeholder="e.g., T^2 = (4\pi^2 / g) L"
            />
            {/* KaTeX Live Render */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
              <KaTeXView math={config.theoreticalEquation} block className="text-white text-base" />
            </div>

            {/* Linear Equation */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Linear Form:
                </label>
                <input
                  type="text"
                  value={config.linearEquation}
                  onChange={(e) => updateField('linearEquation', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="y = mx + c"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    X-Axis:
                  </label>
                  <input
                    type="text"
                    value={config.xAxisSymbol}
                    onChange={(e) => updateField('xAxisSymbol', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-center font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Y-Axis:
                  </label>
                  <input
                    type="text"
                    value={config.yAxisSymbol}
                    onChange={(e) => updateField('yAxisSymbol', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-center font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Physical Meanings */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Physical Meaning of Gradient (m):
                </label>
                <input
                  type="text"
                  value={config.gradientMeaning}
                  onChange={(e) => updateField('gradientMeaning', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., m = 4\pi^2 / g; thus g = 4\pi^2 / m"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Physical Meaning of Intercept (c):
                </label>
                <input
                  type="text"
                  value={config.interceptMeaning}
                  onChange={(e) => updateField('interceptMeaning', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., c = 0 (ideally zero)"
                />
              </div>
            </div>
          </div>

          {/* Target Physical Quantity */}
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
              Target Physical Quantity & Literature Value
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Quantity Name
                </label>
                <input
                  type="text"
                  value={config.targetQuantityName}
                  onChange={(e) => updateField('targetQuantityName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Acceleration due to gravity"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Symbol & Unit
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={config.targetQuantitySymbol}
                    onChange={(e) => updateField('targetQuantitySymbol', e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-center font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                    placeholder="g"
                  />
                  <input
                    type="text"
                    value={config.targetQuantityUnit}
                    onChange={(e) => updateField('targetQuantityUnit', e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="m s^-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Accepted Literature Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={config.acceptedValue}
                  onChange={(e) => updateField('acceptedValue', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                  placeholder="9.807"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Computation Formula (from gradient m)
                </label>
                <input
                  type="text"
                  value={config.targetQuantityFormulaFromGradient}
                  onChange={(e) => updateField('targetQuantityFormulaFromGradient', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. 4 * pi^2 / m"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  LaTeX Formula Display
                </label>
                <input
                  type="text"
                  value={config.targetQuantityLatex}
                  onChange={(e) => updateField('targetQuantityLatex', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="g = \frac{4\pi^2}{m}"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Variables Definition Section */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Experimental Variables & Instrument Least Counts
            </h3>
            <p className="text-xs text-slate-300">
              Define the physical instruments used for each variable and their resolution / least count.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariable}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Variable
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase text-[11px] tracking-wider">
                <th className="py-2.5 px-3">Variable Name</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Least Count (Resolution)</th>
                <th className="py-2.5 px-3">Axis Mapping</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {config.variables.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariable(v.id, { name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.symbol}
                      onChange={(e) => updateVariable(v.id, { symbol: e.target.value })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.unit}
                      onChange={(e) => updateVariable(v.id, { unit: e.target.value })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.instrument}
                      onChange={(e) => updateVariable(v.id, { instrument: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      value={v.leastCount}
                      onChange={(e) => updateVariable(v.id, { leastCount: parseFloat(e.target.value) || 0 })}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={v.axis || 'none'}
                      onChange={(e) => updateVariable(v.id, { axis: e.target.value as any })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="none">None (Intermediate)</option>
                      <option value="x">X-Axis</option>
                      <option value="y">Y-Axis</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeVariable(v.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                      title="Delete variable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Step Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
        >
          <span>Continue to Step 2: Data Sheet</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
