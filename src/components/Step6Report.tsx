import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Edit3,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import {
  DataRow,
  ExperimentConfig,
  FinalPhysicalResult,
  ProcessedPoint,
  RegressionResult,
  ReportSections,
  StudentMeta,
  WorstFitResult,
} from '../types';
import { KaTeXView } from './KaTeXView';
import { generateDocxBlob } from '../utils/exportDocx';

interface Step6ReportProps {
  student: StudentMeta;
  onChangeStudent: (newStudent: StudentMeta) => void;
  config: ExperimentConfig;
  rows: DataRow[];
  points: ProcessedPoint[];
  regression: RegressionResult;
  worstFit: WorstFitResult;
  finalResult: FinalPhysicalResult;
  sections: ReportSections;
  onChangeSections: (newSections: ReportSections) => void;
  currentModel: string;
  onPrev: () => void;
  graphSvgElement?: SVGSVGElement | null;
}

export const Step6Report: React.FC<Step6ReportProps> = ({
  student,
  onChangeStudent,
  config,
  rows,
  points,
  regression,
  worstFit,
  finalResult,
  sections,
  onChangeSections,
  currentModel,
  onPrev,
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatingSectionKey, setGeneratingSectionKey] = useState<string | null>(null);
  const [globalInstruction, setGlobalInstruction] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tweakSectionKey, setTweakSectionKey] = useState<string | null>(null);
  const [tweakPrompt, setTweakPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Real-time Streaming Report Generation using Server-Sent Events
  const handleStreamReport = async () => {
    setIsStreaming(true);
    setStreamingText('');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/stream-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment: config,
          regression,
          finalResult,
          worstFit,
          customInstructions: globalInstruction,
          model: currentModel,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to initiate real-time stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulated += data.text;
                setStreamingText(accumulated);
              }
              if (data.error) {
                setErrorMessage(data.error);
              }
            } catch {
              // ignore partial json
            }
          }
        }
      }

      // Parse accumulated markdown sections into sections state
      const parseSection = (headerPattern: RegExp) => {
        const match = accumulated.split(headerPattern);
        if (match.length > 1) {
          return match[1].split(/^##\s+/m)[0].trim();
        }
        return '';
      };

      const intro = parseSection(/##\s+1\.\s+Introduction/i);
      const theory = parseSection(/##\s+2\.\s+Theory/i);
      const apparatus = parseSection(/##\s+3\.\s+Apparatus/i);
      const methodology = parseSection(/##\s+4\.\s+Experimental Methodology/i);
      const results = parseSection(/##\s+5\.\s+Results/i);
      const errors = parseSection(/##\s+6\.\s+Sources of/i);
      const precautions = parseSection(/##\s+7\.\s+Experimental Precautions/i);
      const conclusion = parseSection(/##\s+8\.\s+Conclusion/i);

      onChangeSections({
        introduction: intro || sections.introduction || accumulated.slice(0, 400),
        theory: theory || sections.theory,
        apparatus: apparatus || sections.apparatus,
        methodology: methodology || sections.methodology,
        resultsAndDiscussion: results || sections.resultsAndDiscussion,
        sourcesOfError: errors || sections.sourcesOfError,
        precautions: precautions || sections.precautions,
        conclusion: conclusion || sections.conclusion,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Streaming report failed.');
    } finally {
      setIsStreaming(false);
    }
  };

  // Generate All Sections with Gemini API via /api/gemini/generate-sections
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/generate-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment: config,
          regression,
          finalResult,
          worstFit,
          customInstructions: globalInstruction,
          model: currentModel,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate report sections.');
      }

      onChangeSections({
        ...sections,
        ...data.sections,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Server error generating report with Gemini.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Regenerate a single section with Gemini
  const handleRegenerateSingle = async (sectionKey: keyof ReportSections, instruction?: string) => {
    setGeneratingSectionKey(sectionKey);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/generate-single-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey,
          currentText: sections[sectionKey],
          experiment: config,
          regression,
          finalResult,
          instruction: instruction || tweakPrompt || 'Refine and improve detail while keeping all numbers strictly factual.',
          model: currentModel,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to regenerate ${sectionKey}.`);
      }

      onChangeSections({
        ...sections,
        [sectionKey]: data.revisedText,
      });
      setTweakSectionKey(null);
      setTweakPrompt('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || `Failed to regenerate section ${sectionKey}.`);
    } finally {
      setGeneratingSectionKey(null);
    }
  };

  // Export Word (.docx)
  const handleExportDocx = async () => {
    try {
      const blob = await generateDocxBlob(
        student,
        config,
        sections,
        regression,
        worstFit,
        finalResult,
        rows,
        points
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.id || 'lab-report'}-${student.studentName || 'physics'}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Word export error:', err);
      alert('Could not generate Word document. Please try again.');
    }
  };

  // Print A4
  const handlePrint = () => {
    window.print();
  };

  const sectionMetaList: { key: keyof ReportSections; title: string; hint: string }[] = [
    { key: 'introduction', title: '1. Introduction', hint: 'Scientific context and purpose of the investigation' },
    { key: 'theory', title: '2. Theory & Derivations', hint: 'First-principles equations and linear form mapping' },
    { key: 'apparatus', title: '3. Apparatus List', hint: 'Complete catalog of equipment and resolutions' },
    { key: 'methodology', title: '4. Experimental Methodology', hint: 'Numbered procedure in past tense, passive voice (no "I" or "we")' },
    { key: 'resultsAndDiscussion', title: '5. Results and Discussion', hint: 'Analysis of linear fit, gradient, and comparison with accepted value' },
    { key: 'sourcesOfError', title: '6. Sources of Experimental Error', hint: 'Detailed systematic and random errors' },
    { key: 'precautions', title: '7. Experimental Precautions', hint: 'Precautions to maintain safety and reduce errors' },
    { key: 'conclusion', title: '8. Conclusion', hint: 'One paragraph summary with final value ± uncertainty' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* AI Controls Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-950/40 to-slate-800 border border-slate-700/80 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                Step 6: AI-Assisted Academic Lab Report
              </h2>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {currentModel}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Gemini writes formal scientific text using your pre-calculated values and error propagations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || isStreaming}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition cursor-pointer ${
                isGeneratingAll
                  ? 'bg-cyan-800 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-600/30'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAll ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAll ? 'Generating Full Report...' : 'Generate Full Report'}</span>
            </button>

            {/* Real-time Streaming SSE Button */}
            <button
              onClick={handleStreamReport}
              disabled={isStreaming || isGeneratingAll}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition cursor-pointer ${
                isStreaming
                  ? 'bg-emerald-800 opacity-80 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-300 animate-ping' : 'bg-emerald-300'}`} />
              <span>{isStreaming ? 'Streaming Live...' : 'Real-Time AI Stream'}</span>
            </button>

            <button
              onClick={handleExportDocx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Word (.docx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 / PDF</span>
            </button>
          </div>
        </div>

        {/* Global instruction input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={globalInstruction}
            onChange={(e) => setGlobalInstruction(e.target.value)}
            placeholder="Optional prompt guidance (e.g., 'Focus heavily on air resistance and parallax error in discussion', 'Keep concise')..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Live Streaming Typewriter Container */}
        {(isStreaming || (streamingText && !isGeneratingAll)) && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-inner space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Gemini Real-Time Stream (Server-Sent Events)</span>
                {isStreaming && (
                  <span className="text-[11px] text-slate-400 font-mono font-normal">
                    — generating tokens live...
                  </span>
                )}
                {!isStreaming && streamingText && (
                  <span className="text-[11px] text-emerald-400 font-mono font-normal">
                    — completed & applied to report sections
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStreamingText('')}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Dismiss Stream Preview
              </button>
            </div>
            <pre className="text-xs text-emerald-200/90 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed scrollbar-thin">
              {streamingText || 'Connecting to Gemini real-time stream...'}
              {isStreaming && <span className="inline-block w-2 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />}
            </pre>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleGenerateAll}
              className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Tabs: Preview vs Section Editor */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            A4 Report Document Preview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edit Individual Sections ({sectionMetaList.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {sections.introduction ? 'Report content generated' : 'Empty sections (Click Generate to populate)'}
        </span>
      </div>

      {/* VIEW 1: Individual Sections Editor */}
      {activeTab === 'edit' && (
        <div className="space-y-4">
          {sectionMetaList.map((meta) => {
            const isRegenerating = generatingSectionKey === meta.key;
            const text = sections[meta.key];

            return (
              <div
                key={meta.key}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {meta.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">{meta.hint}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setTweakSectionKey(tweakSectionKey === meta.key ? null : meta.key)
                      }
                      className="px-2.5 py-1 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition cursor-pointer"
                    >
                      Tweak Prompt
                    </button>
                    <button
                      onClick={() => handleRegenerateSingle(meta.key)}
                      disabled={isRegenerating}
                      className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>{isRegenerating ? 'Writing...' : 'Regenerate'}</span>
                    </button>
                  </div>
                </div>

                {/* Tweak Prompt Flyout */}
                {tweakSectionKey === meta.key && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 flex gap-2">
                    <input
                      type="text"
                      value={tweakPrompt}
                      onChange={(e) => setTweakPrompt(e.target.value)}
                      placeholder="e.g., 'Make it more concise', 'Explain least count in more detail'..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => handleRegenerateSingle(meta.key, tweakPrompt)}
                      className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}

                <textarea
                  rows={meta.key === 'theory' || meta.key === 'methodology' ? 7 : 4}
                  value={text}
                  onChange={(e) =>
                    onChangeSections({
                      ...sections,
                      [meta.key]: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
                  placeholder={`Write or generate ${meta.title}...`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: A4 Formal Academic Document Preview */}
      {activeTab === 'preview' && (
        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 space-y-8 font-serif leading-relaxed max-w-4xl mx-auto border border-slate-200 print:p-0 print:border-none print:shadow-none print:max-w-none">
          {/* Header Title Block */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
              {config.title}
            </h1>
            <p className="text-sm font-sans italic text-slate-600">
              Department of Physics — Laboratory Report
            </p>
          </div>

          {/* Student Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-200 text-xs font-sans">
            <div>
              <span className="text-slate-500 font-bold block">Student Name:</span>
              <input
                type="text"
                value={student.studentName}
                onChange={(e) => onChangeStudent({ ...student, studentName: e.target.value })}
                placeholder="Your Full Name"
                className="w-full bg-transparent border-b border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <span className="text-slate-500 font-bold block">Class / Course:</span>
              <input
                type="text"
                value={student.classOrCourse}
                onChange={(e) => onChangeStudent({ ...student, classOrCourse: e.target.value })}
                placeholder="Physics 101"
                className="w-full bg-transparent border-b border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <span className="text-slate-500 font-bold block">Date:</span>
              <input
                type="text"
                value={student.date}
                onChange={(e) => onChangeStudent({ ...student, date: e.target.value })}
                className="w-full bg-transparent border-b border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <span className="text-slate-500 font-bold block">Lab Partner:</span>
              <input
                type="text"
                value={student.labPartner}
                onChange={(e) => onChangeStudent({ ...student, labPartner: e.target.value })}
                placeholder="Partner Name"
                className="w-full bg-transparent border-b border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* 1. Aim */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              1. Aim of the Experiment
            </h2>
            <p className="text-sm text-slate-800">{config.aim}</p>
          </section>

          {/* 2. Apparatus */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              2. Apparatus List
            </h2>
            <ul className="list-disc list-inside text-sm text-slate-800 space-y-1">
              {config.apparatus.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 3. Introduction */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              3. Introduction
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.introduction || (
                <span className="italic text-slate-400">
                  Click 'Generate Full Report' to populate formal scientific text.
                </span>
              )}
            </div>
          </section>

          {/* 4. Theory & Derivations */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              4. Theory & Mathematical Derivations
            </h2>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center my-2">
              <KaTeXView math={config.theoreticalEquation} block className="text-base text-slate-900" />
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.theory || `Governing equation: ${config.theoreticalEquation}. Linear form: ${config.linearEquation}. Gradient represents: ${config.gradientMeaning}.`}
            </div>
          </section>

          {/* 5. Methodology */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              5. Experimental Methodology (Procedure)
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.methodology || (
                <span className="italic text-slate-400">
                  Procedures will be presented in passive voice past tense.
                </span>
              )}
            </div>
          </section>

          {/* 6. Raw Data Table */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              6. Experimental Data Sheet
            </h2>
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    {config.variables.map((v) => (
                      <th key={v.id} className="py-1.5 px-2 border-l border-slate-200 text-center">
                        {v.name} ({v.symbol}) [{v.unit}]
                      </th>
                    ))}
                    {config.computedColumns.map((c) => (
                      <th key={c.id} className="py-1.5 px-2 border-l border-slate-200 text-center bg-slate-50">
                        {c.name} ({c.symbol}) [{c.unit}]
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="py-1 px-2 text-center font-sans font-bold text-slate-500">{i + 1}</td>
                      {config.variables.map((v) => {
                        const vals = (r.readings[v.id] || []).filter((x) => !isNaN(x));
                        const str = vals.join(', ');
                        return (
                          <td key={v.id} className="py-1 px-2 border-l border-slate-200 text-center">
                            {str || '—'}
                          </td>
                        );
                      })}
                      {config.computedColumns.map((c) => {
                        const pt = points[i];
                        return (
                          <td key={c.id} className="py-1 px-2 border-l border-slate-200 text-center bg-slate-50">
                            {pt ? (c.axis === 'y' ? pt.y.toFixed(4) : pt.x.toFixed(4)) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Uncertainty Analysis Table */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              7. Uncertainty Analysis & Significant Figures
            </h2>
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    <th className="py-1.5 px-2">X Value (x ± Δx)</th>
                    <th className="py-1.5 px-2 text-center">X % Unc</th>
                    <th className="py-1.5 px-2 border-l border-slate-200">Y Value (y ± Δy)</th>
                    <th className="py-1.5 px-2 text-center">Y % Unc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {points.map((p, i) => (
                    <tr key={p.rawRowId}>
                      <td className="py-1 px-2 text-center font-sans font-bold text-slate-500">{i + 1}</td>
                      <td className="py-1 px-2 font-bold text-slate-800">
                        {p.x.toFixed(4)} ± {p.dx.toFixed(4)}
                      </td>
                      <td className="py-1 px-2 text-center text-slate-600">{p.xRelPercent.toFixed(2)}%</td>
                      <td className="py-1 px-2 border-l border-slate-200 font-bold text-slate-800">
                        {p.y.toFixed(4)} ± {p.dy.toFixed(4)}
                      </td>
                      <td className="py-1 px-2 text-center text-slate-600">{p.yRelPercent.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. Graph & Regression Summary */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              8. Graphical Analysis & Regression Working
            </h2>
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2 font-sans text-xs">
              <div className="font-bold text-slate-800">Least-Squares Linear Regression Results:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div>Gradient m: {regression.m.toFixed(5)} ± {regression.se_m.toFixed(5)}</div>
                <div>Intercept c: {regression.c.toFixed(5)} ± {regression.se_c.toFixed(5)}</div>
                <div>Correlation R²: {regression.r2.toFixed(5)}</div>
                <div>Worst-fit Δm: ±{worstFit.deltaM.toFixed(5)}</div>
              </div>
              <div className="text-slate-600 italic pt-1">
                Note: A full 180×250mm standard millimeter graph paper plot is generated and attached in the appendix.
              </div>
            </div>
          </section>

          {/* 9. Final Physical Quantity Determination */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              9. Final Physical Quantity Calculation
            </h2>
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-bold font-sans text-emerald-950">
                  Determined {config.targetQuantityName}:
                </span>
                <span className="text-lg font-mono font-bold text-emerald-900">
                  {config.targetQuantitySymbol} = {finalResult.formatted}
                </span>
              </div>
              <div className="text-xs font-sans text-emerald-800 pt-1">
                Accepted Literature Value: {finalResult.acceptedValue} {config.targetQuantityUnit} (
                {finalResult.percentDifference.toFixed(2)}% difference).
                <span className="font-bold ml-1">
                  {finalResult.agreesWithinUncertainty
                    ? 'Agrees within experimental uncertainty.'
                    : 'Discrepancy exceeds uncertainty margin.'}
                </span>
              </div>
            </div>
          </section>

          {/* 10. Results and Discussion */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              10. Results and Discussion
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.resultsAndDiscussion || (
                <span className="italic text-slate-400">
                  Discussion of graph shape, gradient interpretation, and error bounds.
                </span>
              )}
            </div>
          </section>

          {/* 11. Sources of Error */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              11. Sources of Experimental Error
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.sourcesOfError || (
                <span className="italic text-slate-400">
                  Systematic apparatus calibrations vs random environmental fluctuations.
                </span>
              )}
            </div>
          </section>

          {/* 12. Precautions */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              12. Experimental Precautions
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.precautions || (
                <span className="italic text-slate-400">
                  Practical precautions taken during execution.
                </span>
              )}
            </div>
          </section>

          {/* 13. Conclusion */}
          <section className="space-y-2">
            <h2 className="text-lg font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">
              13. Conclusion
            </h2>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {sections.conclusion || (
                <span className="italic text-slate-400">
                  Summary statement with final value ± uncertainty.
                </span>
              )}
            </div>
          </section>
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
          <span>Back: Calculations</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportDocx}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download .docx</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (A4)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
