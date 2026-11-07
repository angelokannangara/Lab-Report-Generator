import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SidebarStepper, STEPS } from './components/SidebarStepper';
import { Step1Setup } from './components/Step1Setup';
import { Step2DataSheet } from './components/Step2DataSheet';
import { Step3Uncertainty } from './components/Step3Uncertainty';
import { Step4Graph } from './components/Step4Graph';
import { Step5Calculations } from './components/Step5Calculations';
import { Step6Report } from './components/Step6Report';
import { AiChatbot } from './components/AiChatbot';
import { PRESETS } from './utils/presets';
import {
  DataRow,
  ExperimentConfig,
  FinalPhysicalResult,
  FullReportState,
  ProcessedPoint,
  RegressionResult,
  ReportSections,
  StudentMeta,
  WorstFitResult,
} from './types';
import { calculateRepeatStats, propagateColumnUncertainty } from './utils/uncertainty';
import { evaluateFormula, formatValueWithUncertainty } from './utils/math';
import { calculateLinearRegression } from './utils/regression';
import { calculateWorstFitLines } from './utils/worstFit';

const CURRENT_STORAGE_KEY = 'lab_report_studio_active_v1';
const SAVED_INDEX_KEY = 'lab_report_studio_saved_names_v1';

export default function App() {
  // Current active step: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Active preset ID
  const [currentPresetId, setCurrentPresetId] = useState<string>('simple_pendulum');

  // Student details
  const [student, setStudent] = useState<StudentMeta>({
    studentName: 'Alex Mercer',
    classOrCourse: 'General Physics I (PHYS 101)',
    date: new Date().toISOString().split('T')[0],
    labPartner: 'Jordan Lee',
    institution: 'Department of Physics',
  });

  // Experiment Configuration
  const [config, setConfig] = useState<ExperimentConfig>(PRESETS.simple_pendulum.config);

  // Raw Measurement Rows
  const [rows, setRows] = useState<DataRow[]>(PRESETS.simple_pendulum.defaultRows);

  // AI Written Text Sections
  const [sections, setSections] = useState<ReportSections>({
    introduction: '',
    theory: '',
    apparatus: '',
    methodology: '',
    resultsAndDiscussion: '',
    sourcesOfError: '',
    precautions: '',
    conclusion: '',
  });

  // Settings & Display options
  const [currentModel, setCurrentModel] = useState<string>('gemini-2.5-flash');
  const [graphStyle, setGraphStyle] = useState<'paper' | 'clean'>('paper');
  const [showErrorBars, setShowErrorBars] = useState<boolean>(true);
  const [showWorstFit, setShowWorstFit] = useState<boolean>(true);
  const [showTriangle, setShowTriangle] = useState<boolean>(true);
  const [showMeanPoint, setShowMeanPoint] = useState<boolean>(true);

  // List of saved reports
  const [savedReportNames, setSavedReportNames] = useState<string[]>([]);

  // Load from localStorage on initial mount
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem(SAVED_INDEX_KEY);
      if (savedIndex) {
        setSavedReportNames(JSON.parse(savedIndex));
      }

      const activeSaved = localStorage.getItem(CURRENT_STORAGE_KEY);
      if (activeSaved) {
        const parsed: FullReportState = JSON.parse(activeSaved);
        if (parsed.experiment && parsed.dataRows) {
          setConfig(parsed.experiment);
          setRows(parsed.dataRows);
          if (parsed.student) setStudent(parsed.student);
          if (parsed.reportSections) setSections(parsed.reportSections);
          if (parsed.model) setCurrentModel(parsed.model);
          if (parsed.graphStyle) setGraphStyle(parsed.graphStyle);
          if (parsed.showErrorBars !== undefined) setShowErrorBars(parsed.showErrorBars);
          if (parsed.showWorstFit !== undefined) setShowWorstFit(parsed.showWorstFit);
          if (parsed.showTriangle !== undefined) setShowTriangle(parsed.showTriangle);
          if (parsed.showMeanPoint !== undefined) setShowMeanPoint(parsed.showMeanPoint);
          if (parsed.experiment.id) setCurrentPresetId(parsed.experiment.id);
        }
      }
    } catch (e) {
      console.error('Failed to load saved state from localStorage:', e);
    }
  }, []);

  // Save active state to localStorage on changes
  useEffect(() => {
    const fullState: FullReportState = {
      version: 1,
      student,
      experiment: config,
      dataRows: rows,
      reportSections: sections,
      model: currentModel,
      graphStyle,
      showErrorBars,
      showWorstFit,
      showTriangle,
      showMeanPoint,
    };
    try {
      localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(fullState));
    } catch (e) {
      console.warn('localStorage quota exceeded:', e);
    }
  }, [student, config, rows, sections, currentModel, graphStyle, showErrorBars, showWorstFit, showTriangle, showMeanPoint]);

  // Derive points for plotting and mathematical analysis
  const points: ProcessedPoint[] = useMemo(() => {
    // 1. Identify which variable or computed column is X
    const xComputed = config.computedColumns.find((c) => c.axis === 'x');
    const xVar = config.variables.find((v) => v.axis === 'x') || config.variables[0];

    // 2. Identify which variable or computed column is Y
    const yComputed = config.computedColumns.find((c) => c.axis === 'y');
    const yVar =
      config.variables.find((v) => v.axis === 'y') ||
      config.variables[1] ||
      config.variables[0];

    const result: ProcessedPoint[] = [];

    rows.forEach((r, idx) => {
      // Gather stats for all measured variables in this row
      const scope: Record<string, number> = {};
      const varMap: Record<string, { value: number; uncertainty: number }> = {};

      for (const v of config.variables) {
        const stats = calculateRepeatStats(r.readings[v.id] || [], v.leastCount, config.uncertaintyMethod);
        scope[v.id] = stats.mean;
        scope[v.symbol] = stats.mean;
        varMap[v.id] = { value: stats.mean, uncertainty: stats.absoluteUncertainty };
        varMap[v.symbol] = { value: stats.mean, uncertainty: stats.absoluteUncertainty };
      }

      // Compute derived columns in order
      for (const c of config.computedColumns) {
        const val = evaluateFormula(c.formula, scope);
        const prop = propagateColumnUncertainty(c.formula, varMap, val);
        scope[c.id] = val;
        scope[c.symbol] = val;
        varMap[c.id] = { value: val, uncertainty: prop.uncertainty };
        varMap[c.symbol] = { value: val, uncertainty: prop.uncertainty };
      }

      // Extract X
      let xVal = NaN;
      let dx = 0.001;
      if (xComputed && varMap[xComputed.id]) {
        xVal = varMap[xComputed.id].value;
        dx = varMap[xComputed.id].uncertainty;
      } else if (xVar && varMap[xVar.id]) {
        xVal = varMap[xVar.id].value;
        dx = varMap[xVar.id].uncertainty;
      }

      // Extract Y
      let yVal = NaN;
      let dy = 0.001;
      if (yComputed && varMap[yComputed.id]) {
        yVal = varMap[yComputed.id].value;
        dy = varMap[yComputed.id].uncertainty;
      } else if (yVar && varMap[yVar.id]) {
        yVal = varMap[yVar.id].value;
        dy = varMap[yVar.id].uncertainty;
      }

      if (Number.isFinite(xVal) && Number.isFinite(yVal)) {
        const xRelPercent = xVal !== 0 ? Math.abs(dx / xVal) * 100 : 0;
        const yRelPercent = yVal !== 0 ? Math.abs(dy / yVal) * 100 : 0;

        result.push({
          index: idx,
          rawRowId: r.id,
          x: xVal,
          y: yVal,
          dx,
          dy,
          xRelPercent,
          yRelPercent,
        });
      }
    });

    return result;
  }, [config, rows]);

  // Derived regression
  const regression: RegressionResult = useMemo(() => {
    return calculateLinearRegression(points, false);
  }, [points]);

  // Derived worst fit
  const worstFit: WorstFitResult = useMemo(() => {
    return calculateWorstFitLines(points, regression);
  }, [points, regression]);

  // Final physical quantity
  const finalResult: FinalPhysicalResult = useMemo(() => {
    const scope = {
      m: regression.m,
      c: regression.c,
      pi: Math.PI,
      PI: Math.PI,
    };

    const val = evaluateFormula(config.targetQuantityFormulaFromGradient, scope);
    const mAbs = Math.abs(regression.m);
    const deltaM = Math.max(regression.se_m, worstFit.deltaM, 1e-6);
    const relPercentM = mAbs > 0 ? (deltaM / mAbs) * 100 : 0;
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

  // Track completed steps
  const completedSteps = useMemo(() => {
    const done: number[] = [1];
    if (rows.length >= 2) done.push(2);
    if (points.length >= 2) done.push(3, 4, 5);
    if (sections.conclusion || sections.introduction) done.push(6);
    return done;
  }, [rows, points, sections]);

  // Handle Preset Selection
  const handleSelectPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setCurrentPresetId(presetKey);
      setConfig(preset.config);
      setRows(preset.defaultRows);
      setSections({
        introduction: '',
        theory: '',
        apparatus: '',
        methodology: '',
        resultsAndDiscussion: '',
        sourcesOfError: '',
        precautions: '',
        conclusion: '',
      });
    }
  }, []);

  // One-click sample dataset loader
  const handleLoadSampleData = useCallback(() => {
    const preset = PRESETS[currentPresetId] || PRESETS.simple_pendulum;
    setConfig(preset.config);
    setRows(preset.defaultRows);
  }, [currentPresetId]);

  // Reset all to defaults
  const handleReset = useCallback(() => {
    if (window.confirm('Reset current experiment and data back to Simple Pendulum default?')) {
      handleSelectPreset('simple_pendulum');
      setCurrentStep(1);
    }
  }, [handleSelectPreset]);

  // Save report with custom name to localStorage
  const handleSaveReport = useCallback(
    (name: string) => {
      const fullState: FullReportState = {
        version: 1,
        student,
        experiment: config,
        dataRows: rows,
        reportSections: sections,
        model: currentModel,
        graphStyle,
        showErrorBars,
        showWorstFit,
        showTriangle,
        showMeanPoint,
      };

      try {
        localStorage.setItem(`lab_report_studio_saved_${name}`, JSON.stringify(fullState));
        const updatedList = Array.from(new Set([...savedReportNames, name]));
        setSavedReportNames(updatedList);
        localStorage.setItem(SAVED_INDEX_KEY, JSON.stringify(updatedList));
      } catch (e) {
        alert('Could not save report. Storage might be full.');
      }
    },
    [student, config, rows, sections, currentModel, graphStyle, showErrorBars, showWorstFit, showTriangle, showMeanPoint, savedReportNames]
  );

  // Load saved report from localStorage
  const handleLoadSavedReport = useCallback((name: string) => {
    try {
      const dataStr = localStorage.getItem(`lab_report_studio_saved_${name}`);
      if (dataStr) {
        const parsed: FullReportState = JSON.parse(dataStr);
        setConfig(parsed.experiment);
        setRows(parsed.dataRows);
        setStudent(parsed.student);
        setSections(parsed.reportSections);
        setCurrentModel(parsed.model || 'gemini-2.5-flash');
        setGraphStyle(parsed.graphStyle || 'paper');
        setShowErrorBars(parsed.showErrorBars ?? true);
        setShowWorstFit(parsed.showWorstFit ?? true);
        setShowTriangle(parsed.showTriangle ?? true);
        setShowMeanPoint(parsed.showMeanPoint ?? true);
        setCurrentPresetId(parsed.experiment.id || 'custom');
      }
    } catch (e) {
      alert(`Could not load report "${name}".`);
    }
  }, []);

  // Delete saved report
  const handleDeleteSavedReport = useCallback(
    (name: string) => {
      localStorage.removeItem(`lab_report_studio_saved_${name}`);
      const updated = savedReportNames.filter((n) => n !== name);
      setSavedReportNames(updated);
      localStorage.setItem(SAVED_INDEX_KEY, JSON.stringify(updated));
    },
    [savedReportNames]
  );

  // Export full JSON file
  const handleExportJson = useCallback(() => {
    const fullState: FullReportState = {
      version: 1,
      student,
      experiment: config,
      dataRows: rows,
      reportSections: sections,
      model: currentModel,
      graphStyle,
      showErrorBars,
      showWorstFit,
      showTriangle,
      showMeanPoint,
    };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-report-${config.id || 'physics'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [student, config, rows, sections, currentModel, graphStyle, showErrorBars, showWorstFit, showTriangle, showMeanPoint]);

  // Import JSON file
  const handleImportJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: FullReportState = JSON.parse(text);
        if (parsed.experiment && parsed.dataRows) {
          setConfig(parsed.experiment);
          setRows(parsed.dataRows);
          if (parsed.student) setStudent(parsed.student);
          if (parsed.reportSections) setSections(parsed.reportSections);
          if (parsed.model) setCurrentModel(parsed.model);
          if (parsed.graphStyle) setGraphStyle(parsed.graphStyle);
          setCurrentPresetId(parsed.experiment.id || 'custom');
          alert('Lab report data successfully imported!');
        } else {
          alert('Invalid lab report file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Top Navigation */}
      <Navbar
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onLoadSampleData={handleLoadSampleData}
        onReset={handleReset}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onSaveReport={handleSaveReport}
        savedReportNames={savedReportNames}
        onLoadSavedReport={handleLoadSavedReport}
        onDeleteSavedReport={handleDeleteSavedReport}
        currentModel={currentModel}
        onChangeModel={setCurrentModel}
        onTriggerPrint={() => {
          setCurrentStep(6);
          setTimeout(() => window.print(), 300);
        }}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Step Navigation Sidebar */}
        <SidebarStepper
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          completedSteps={completedSteps}
        />

        {/* Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentStep === 1 && (
            <Step1Setup
              config={config}
              onChangeConfig={setConfig}
              onApplyPreset={handleSelectPreset}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <Step2DataSheet
              config={config}
              onChangeConfig={setConfig}
              rows={rows}
              onChangeRows={setRows}
              onNext={() => setCurrentStep(3)}
              onPrev={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <Step3Uncertainty
              config={config}
              onChangeConfig={setConfig}
              rows={rows}
              onNext={() => setCurrentStep(4)}
              onPrev={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Step4Graph
              config={config}
              onChangeConfig={setConfig}
              points={points}
              graphStyle={graphStyle}
              onChangeGraphStyle={setGraphStyle}
              showErrorBars={showErrorBars}
              onToggleErrorBars={setShowErrorBars}
              showWorstFit={showWorstFit}
              onToggleWorstFit={setShowWorstFit}
              showTriangle={showTriangle}
              onToggleTriangle={setShowTriangle}
              showMeanPoint={showMeanPoint}
              onToggleMeanPoint={setShowMeanPoint}
              onNext={() => setCurrentStep(5)}
              onPrev={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 5 && (
            <Step5Calculations
              config={config}
              onChangeConfig={setConfig}
              points={points}
              onNext={() => setCurrentStep(6)}
              onPrev={() => setCurrentStep(4)}
            />
          )}

          {currentStep === 6 && (
            <Step6Report
              student={student}
              onChangeStudent={setStudent}
              config={config}
              rows={rows}
              points={points}
              regression={regression}
              worstFit={worstFit}
              finalResult={finalResult}
              sections={sections}
              onChangeSections={setSections}
              currentModel={currentModel}
              onPrev={() => setCurrentStep(5)}
            />
          )}
        </main>
      </div>

      {/* Floating Real-Time AI Lab Assistant Chatbot */}
      <AiChatbot
        experiment={config}
        regression={regression}
        finalResult={finalResult}
      />
    </div>
  );
}
