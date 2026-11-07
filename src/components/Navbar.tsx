import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  FolderOpen,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Upload,
  Check,
  FileText,
} from 'lucide-react';
import { PRESETS } from '../utils/presets';
import { ExperimentConfig, FullReportState } from '../types';

interface NavbarProps {
  currentPresetId: string;
  onSelectPreset: (presetKey: string) => void;
  onLoadSampleData: () => void;
  onReset: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveReport: (name: string) => void;
  savedReportNames: string[];
  onLoadSavedReport: (name: string) => void;
  onDeleteSavedReport: (name: string) => void;
  currentModel: string;
  onChangeModel: (model: string) => void;
  onTriggerPrint: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPresetId,
  onSelectPreset,
  onLoadSampleData,
  onReset,
  onExportJson,
  onImportJson,
  onSaveReport,
  savedReportNames,
  onLoadSavedReport,
  onDeleteSavedReport,
  currentModel,
  onChangeModel,
  onTriggerPrint,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportSaveName, setReportSaveName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportSaveName.trim()) return;
    onSaveReport(reportSaveName.trim());
    setReportSaveName('');
    setShowSaveModal(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
            <BookOpen className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Lab Report Studio
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                Physics A4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic regression & uncertainty analysis with AI report writing
            </p>
          </div>
        </div>

        {/* Central Presets & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <label htmlFor="preset-select" className="text-xs text-slate-400 font-medium">
              Preset:
            </label>
            <select
              id="preset-select"
              aria-label="Experiment preset"
              value={currentPresetId}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-transparent text-xs font-medium text-cyan-300 focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[280px] truncate"
            >
              <optgroup label="🏛️ USJP Physics Lab Manual" className="bg-slate-900 text-cyan-400 font-bold">
                <option value="exp01_refractive_indices" className="bg-slate-800 text-white">Exp 01: Refractive Indices (Traveling Microscope)</option>
                <option value="exp02_stokes_viscosity" className="bg-slate-800 text-white">Exp 02: Stoke's Viscosity (vt vs r²)</option>
                <option value="resistivity_wire" className="bg-slate-800 text-white">Exp 03: Metre Bridge & Resistivity</option>
                <option value="exp05_deflection_magnetometer" className="bg-slate-800 text-white">Exp 05: Deflection Magnetometer</option>
                <option value="exp07_voltage_regulation" className="bg-slate-800 text-white">Exp 07: Voltage Regulation & Diode</option>
                <option value="exp08_op_amp" className="bg-slate-800 text-white">Exp 08: OP-AMP UA741 Inverting</option>
                <option value="exp09_bifilar_suspension" className="bg-slate-800 text-white">Exp 09: Bifilar Suspension (Inertia I)</option>
                <option value="exp10_plancks_constant" className="bg-slate-800 text-white">Exp 10: Planck's Constant (Photoelectric)</option>
                <option value="exp10b_boltzmann_constant" className="bg-slate-800 text-white">Exp 10B: Boltzmann Constant (Diode)</option>
              </optgroup>
              <optgroup label="📐 Foundational Physics Labs" className="bg-slate-900 text-indigo-400 font-bold">
                <option value="simple_pendulum" className="bg-slate-800 text-white">Simple Pendulum (g from T² vs L)</option>
                <option value="hookes_law" className="bg-slate-800 text-white">Hooke's Law (Spring constant k)</option>
                <option value="ohms_law" className="bg-slate-800 text-white">Ohm's Law (Resistance R)</option>
                <option value="youngs_modulus" className="bg-slate-800 text-white">Young's Modulus (Searle's)</option>
              </optgroup>
            </select>
          </div>

          {/* Load Sample Data Button */}
          <button
            onClick={onLoadSampleData}
            title="Load sample dataset for current experiment"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Data</span>
          </button>

          {/* Save / Load Reports */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Save / Load ({savedReportNames.length})</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={onExportJson}
            title="Export Report Data as JSON"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
            aria-label="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* JSON Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Report Data from JSON"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
            aria-label="Import JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImportJson}
          />

          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Gemini AI & App Settings"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Print preview shortcut */}
          <button
            onClick={onTriggerPrint}
            title="Print or Save PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* Save / Load Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Save className="w-4 h-4 text-cyan-400" />
              Save or Load Reports
            </h3>
            <p className="text-xs text-slate-300">
              Save your current experiment, measured data, and generated report to your browser storage.
            </p>

            <form onSubmit={handleSaveSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Save current report as:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reportSaveName}
                    onChange={(e) => setReportSaveName(e.target.value)}
                    placeholder="e.g., Simple Pendulum Lab 1"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Saved Reports in Browser ({savedReportNames.length})
              </label>
              {savedReportNames.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No saved reports yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {savedReportNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs"
                    >
                      <span className="font-medium text-slate-200 truncate">{name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onLoadSavedReport(name);
                            setShowSaveModal(false);
                          }}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-cyan-300 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => onDeleteSavedReport(name)}
                          className="px-2 py-1 text-red-400 hover:bg-red-950/40 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Settings & Model Configuration
            </h3>
            <p className="text-xs text-slate-300">
              The Gemini API powers the structured report section generation on the server.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Active Gemini Model:
                </label>
                <select
                  value={currentModel}
                  onChange={(e) => onChangeModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Default - Fast & Precise)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Latest Flash Model)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Lightweight)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Uses server-side proxy route with process.env.GEMINI_API_KEY. All numerical values and formulas are passed deterministically to the model.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Server Connection:</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Deterministic Math Engine:</span>
                  <span className="text-cyan-400">Active (TS Native)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All to Defaults
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
