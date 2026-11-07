import React, { useRef, useState, useMemo } from 'react';
import {
  Download,
  Eye,
  Sliders,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Layers,
  ZoomIn,
} from 'lucide-react';
import {
  ExperimentConfig,
  GradientTriangle,
  GridScale,
  ProcessedPoint,
  RegressionResult,
  WorstFitResult,
} from '../types';
import { calculateGridScale, formatAxisNumber } from '../utils/scale';
import { calculateLinearRegression } from '../utils/regression';
import { calculateWorstFitLines, calculateGradientTriangle } from '../utils/worstFit';
import { KaTeXView } from './KaTeXView';

interface Step4GraphProps {
  config: ExperimentConfig;
  onChangeConfig: (newConfig: ExperimentConfig) => void;
  points: ProcessedPoint[];
  graphStyle: 'paper' | 'clean';
  onChangeGraphStyle: (style: 'paper' | 'clean') => void;
  showErrorBars: boolean;
  onToggleErrorBars: (v: boolean) => void;
  showWorstFit: boolean;
  onToggleWorstFit: (v: boolean) => void;
  showTriangle: boolean;
  onToggleTriangle: (v: boolean) => void;
  showMeanPoint: boolean;
  onToggleMeanPoint: (v: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Graph: React.FC<Step4GraphProps> = ({
  config,
  onChangeConfig,
  points,
  graphStyle,
  onChangeGraphStyle,
  showErrorBars,
  onToggleErrorBars,
  showWorstFit,
  onToggleWorstFit,
  showTriangle,
  onToggleTriangle,
  showMeanPoint,
  onToggleMeanPoint,
  onNext,
  onPrev,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Grid scale calculation (180 mm wide x 250 mm tall)
  const scale = useMemo(() => {
    return calculateGridScale(points, config.startAxesAtZero, 180, 250);
  }, [points, config.startAxesAtZero]);

  // 2. Linear Regression (least squares)
  const regression: RegressionResult = useMemo(() => {
    return calculateLinearRegression(points, false);
  }, [points]);

  // 3. Worst-fit lines
  const worstFit: WorstFitResult = useMemo(() => {
    return calculateWorstFitLines(points, regression);
  }, [points, regression]);

  // 4. Gradient triangle
  const triangle: GradientTriangle = useMemo(() => {
    return calculateGradientTriangle(points, regression);
  }, [points, regression]);

  // Dimensions & Margins (in mm)
  const gridW = 180;
  const gridH = 250;
  const marginL = 30;
  const marginB = 25;
  const marginT = 20;
  const marginR = 15;
  const totalW = marginL + gridW + marginR; // 225 mm
  const totalH = marginT + gridH + marginB; // 295 mm

  // Coordinate mapping: converts real world (x, y) to SVG (mm)
  const mapX = (xVal: number) => {
    const fraction = (xVal - scale.xMin) / (scale.xMax - scale.xMin);
    return marginL + fraction * gridW;
  };

  const mapY = (yVal: number) => {
    // In SVG, 0 is top, gridH is bottom
    const fraction = (yVal - scale.yMin) / (scale.yMax - scale.yMin);
    return marginT + gridH - fraction * gridH;
  };

  // Convert mm delta to svg pixels / mm
  const mmX = (valDelta: number) => {
    return (valDelta / (scale.xMax - scale.xMin)) * gridW;
  };

  const mmY = (valDelta: number) => {
    return (valDelta / (scale.yMax - scale.yMin)) * gridH;
  };

  // Regression line endpoints on the grid
  const xLineStart = scale.xMin;
  const yLineStart = regression.m * xLineStart + regression.c;
  const xLineEnd = scale.xMax;
  const yLineEnd = regression.m * xLineEnd + regression.c;

  // Worst fit line endpoints
  const yMaxStart = worstFit.maxLine.m * xLineStart + worstFit.maxLine.c;
  const yMaxEnd = worstFit.maxLine.m * xLineEnd + worstFit.maxLine.c;
  const yMinStart = worstFit.minLine.m * xLineStart + worstFit.minLine.c;
  const yMinEnd = worstFit.minLine.m * xLineEnd + worstFit.minLine.c;

  // Styles configuration
  const isPaper = graphStyle === 'paper';
  const paperColors = {
    bg: '#f8fdf9', // Authentic millimeter paper light tint
    gridFine: '#cde9d6', // 1mm line
    gridMedium: '#a3d9b4', // 5mm line
    gridMajor: '#6cbf88', // 10mm line
    axes: '#1b432c',
    text: '#133522',
    dataPoint: '#0f766e',
    errorBar: '#0d9488',
    bestFit: '#0369a1',
    meanPoint: '#b91c1c',
  };

  const cleanColors = {
    bg: '#ffffff',
    gridFine: '#f1f5f9',
    gridMedium: '#e2e8f0',
    gridMajor: '#cbd5e1',
    axes: '#0f172a',
    text: '#1e293b',
    dataPoint: '#2563eb',
    errorBar: '#3b82f6',
    bestFit: '#0284c7',
    meanPoint: '#dc2626',
  };

  const c = isPaper ? paperColors : cleanColors;

  // Export SVG handler
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${config.id || 'plot'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PNG handler (300 DPI high resolution)
  const handleDownloadPng = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // 300 DPI rendering: scale factor of 4
      const scaleFactor = 4;
      const canvas = document.createElement('canvas');
      canvas.width = totalW * scaleFactor * 3.78; // approx 1mm = 3.78px
      canvas.height = totalH * scaleFactor * 3.78;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `graph-${config.id || 'plot'}.png`;
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Step 4: Standard 180×250mm Graph Paper
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Full 1 mm grid resolution with 1, 2, or 5 × 10ⁿ scaling, error bars, worst-fit lines, and gradient triangle.
          </p>
        </div>

        {/* View toggles & export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Paper style switch */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => onChangeGraphStyle('paper')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isPaper
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paper Style
            </button>
            <button
              onClick={() => onChangeGraphStyle('clean')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                !isPaper
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clean Style
            </button>
          </div>

          {/* Download Buttons */}
          <button
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition cursor-pointer"
            title="Download Graph as SVG vector"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>SVG</span>
          </button>
          <button
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm shadow-cyan-600/20"
            title="Download Graph as 300 DPI PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Layer Toggles & Scale Options */}
      <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showErrorBars}
              onChange={(e) => onToggleErrorBars(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span>Error Bars (X & Y)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showMeanPoint}
              onChange={(e) => onToggleMeanPoint(e.target.checked)}
              className="rounded accent-rose-500"
            />
            <span>Mean Point (x̄, ȳ)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWorstFit}
              onChange={(e) => onToggleWorstFit(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>Worst-Fit Lines (Max/Min)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTriangle}
              onChange={(e) => onToggleTriangle(e.target.checked)}
              className="rounded accent-indigo-500"
            />
            <span>Gradient Triangle (Δy / Δx)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none border-l border-slate-700 pl-4">
            <input
              type="checkbox"
              checked={config.startAxesAtZero}
              onChange={(e) =>
                onChangeConfig({ ...config, startAxesAtZero: e.target.checked })
              }
              className="rounded accent-emerald-500"
            />
            <span>Start Axes at (0, 0)</span>
          </label>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
            <span className="w-2.5 h-0.5 bg-sky-400"></span> Best Fit (m = {regression.m.toFixed(4)})
          </span>
          {showWorstFit && (
            <>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                <span className="w-2.5 h-0.5 bg-amber-400"></span> Max: {worstFit.maxLine.m.toFixed(4)}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800">
                <span className="w-2.5 h-0.5 bg-violet-400"></span> Min: {worstFit.minLine.m.toFixed(4)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scale Working & Arithmetic Box */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <Sliders className="w-4 h-4" />
          Scale Determination Working (180 mm × 250 mm Standard Sheet)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-300">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="font-bold text-white mb-1">X-Axis Scale Working:</div>
            <div>Data Range: [{scale.xMin.toFixed(3)}, {scale.xMax.toFixed(3)}]</div>
            <div>Raw Span = {(scale.xSpan).toFixed(3)} ÷ 180 mm = {scale.xRawPerMm.toPrecision(3)} / mm</div>
            <div className="text-emerald-400 font-bold mt-1">
              Rounded Easy Scale = {scale.xScalePerMm} per 1 mm square
            </div>
            <div className="text-cyan-300 font-bold">
              Scale Statement: 1 cm (10 mm) = {scale.xUnitsPerCm} {config.xAxisSymbol}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="font-bold text-white mb-1">Y-Axis Scale Working:</div>
            <div>Data Range: [{scale.yMin.toFixed(3)}, {scale.yMax.toFixed(3)}]</div>
            <div>Raw Span = {(scale.ySpan).toFixed(3)} ÷ 250 mm = {scale.yRawPerMm.toPrecision(3)} / mm</div>
            <div className="text-emerald-400 font-bold mt-1">
              Rounded Easy Scale = {scale.yScalePerMm} per 1 mm square
            </div>
            <div className="text-cyan-300 font-bold">
              Scale Statement: 1 cm (10 mm) = {scale.yUnitsPerCm} {config.yAxisSymbol}
            </div>
          </div>
        </div>
      </div>

      {/* The SVG Canvas Container */}
      <div className="flex justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto shadow-2xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${totalW} ${totalH}`}
          width="100%"
          style={{ maxWidth: '520px', maxHeight: '680px', height: 'auto' }}
          className="rounded-lg shadow-inner bg-white/5"
        >
          {/* SVG Definitions for Grid Patterns */}
          <defs>
            {/* 1 mm fine grid */}
            <pattern id="grid-1mm" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke={c.gridFine} strokeWidth="0.12" />
            </pattern>
            {/* 5 mm medium grid */}
            <pattern id="grid-5mm" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="url(#grid-1mm)" />
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke={c.gridMedium} strokeWidth="0.25" />
            </pattern>
            {/* 10 mm major grid */}
            <pattern id="grid-10mm" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="url(#grid-5mm)" />
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={c.gridMajor} strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Graph Background */}
          <rect x="0" y="0" width={totalW} height={totalH} fill={c.bg} />

          {/* Grid Paper Area (180 mm x 250 mm) */}
          <g transform={`translate(${marginL}, ${marginT})`}>
            {/* Millimetre Grid */}
            <rect width={gridW} height={gridH} fill="url(#grid-10mm)" />
            {/* Border around grid */}
            <rect
              width={gridW}
              height={gridH}
              fill="none"
              stroke={c.axes}
              strokeWidth="0.8"
            />
          </g>

          {/* Title & Scale Banner on top of graph */}
          <g>
            <text
              x={marginL + gridW / 2}
              y={marginT - 10}
              textAnchor="middle"
              fill={c.text}
              fontSize="4.5"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {config.title}
            </text>
            <text
              x={marginL + gridW / 2}
              y={marginT - 4}
              textAnchor="middle"
              fill={c.text}
              fontSize="3.2"
              fontFamily="monospace"
            >
              Scale: X: 1 cm = {scale.xUnitsPerCm} | Y: 1 cm = {scale.yUnitsPerCm}
            </text>
          </g>

          {/* Axes Tick Marks & Values */}
          {/* X-Axis Ticks (Bottom) */}
          {scale.xTicks.map((t, idx) => {
            const xPos = marginL + t.mm;
            const yPos = marginT + gridH;
            return (
              <g key={`xtick-${idx}`}>
                <line
                  x1={xPos}
                  y1={yPos}
                  x2={xPos}
                  y2={yPos + (t.mm % 10 === 0 ? 2.5 : 1.5)}
                  stroke={c.axes}
                  strokeWidth={t.mm % 10 === 0 ? '0.5' : '0.25'}
                />
                {t.label && (
                  <text
                    x={xPos}
                    y={yPos + 6}
                    textAnchor="middle"
                    fill={c.text}
                    fontSize="2.8"
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Y-Axis Ticks (Left) */}
          {scale.yTicks.map((t, idx) => {
            const xPos = marginL;
            const yPos = marginT + gridH - t.mm;
            return (
              <g key={`ytick-${idx}`}>
                <line
                  x1={xPos - (t.mm % 10 === 0 ? 2.5 : 1.5)}
                  y1={yPos}
                  x2={xPos}
                  y2={yPos}
                  stroke={c.axes}
                  strokeWidth={t.mm % 10 === 0 ? '0.5' : '0.25'}
                />
                {t.label && (
                  <text
                    x={xPos - 4}
                    y={yPos + 1}
                    textAnchor="end"
                    fill={c.text}
                    fontSize="2.8"
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-Axis Label */}
          <text
            x={marginL + gridW / 2}
            y={marginT + gridH + 16}
            textAnchor="middle"
            fill={c.text}
            fontSize="4.2"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {config.xAxisSymbol} ({config.variables.find((v) => v.axis === 'x')?.unit || ''})
          </text>

          {/* Y-Axis Label */}
          <text
            x={-(marginT + gridH / 2)}
            y={marginL - 18}
            transform="rotate(-90)"
            textAnchor="middle"
            fill={c.text}
            fontSize="4.2"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {config.yAxisSymbol} (
            {config.computedColumns.find((col) => col.axis === 'y')?.unit ||
              config.variables.find((v) => v.axis === 'y')?.unit ||
              ''}
            )
          </text>

          {/* CLIPPED PLOTTING REGION (Lines & Points stay inside 180x250mm) */}
          <g clipPath="url(#graph-clip)">
            <clipPath id="graph-clip">
              <rect x={marginL} y={marginT} width={gridW} height={gridH} />
            </clipPath>

            {/* Worst Fit Lines */}
            {showWorstFit && (
              <>
                {/* Max Gradient Line (Amber dashed) */}
                <line
                  x1={mapX(xLineStart)}
                  y1={mapY(yMaxStart)}
                  x2={mapX(xLineEnd)}
                  y2={mapY(yMaxEnd)}
                  stroke="#f59e0b"
                  strokeWidth="0.6"
                  strokeDasharray="2, 1.5"
                />
                {/* Min Gradient Line (Violet dashed) */}
                <line
                  x1={mapX(xLineStart)}
                  y1={mapY(yMinStart)}
                  x2={mapX(xLineEnd)}
                  y2={mapY(yMinEnd)}
                  stroke="#8b5cf6"
                  strokeWidth="0.6"
                  strokeDasharray="2, 1.5"
                />
              </>
            )}

            {/* Best Fit Line */}
            <line
              x1={mapX(xLineStart)}
              y1={mapY(yLineStart)}
              x2={mapX(xLineEnd)}
              y2={mapY(yLineEnd)}
              stroke={c.bestFit}
              strokeWidth="0.9"
            />

            {/* Gradient Triangle */}
            {showTriangle && (
              <g>
                {/* Right angle dashed lines */}
                <line
                  x1={mapX(triangle.x1)}
                  y1={mapY(triangle.y1)}
                  x2={mapX(triangle.x2)}
                  y2={mapY(triangle.y1)}
                  stroke="#6366f1"
                  strokeWidth="0.5"
                  strokeDasharray="1.5, 1"
                />
                <line
                  x1={mapX(triangle.x2)}
                  y1={mapY(triangle.y1)}
                  x2={mapX(triangle.x2)}
                  y2={mapY(triangle.y2)}
                  stroke="#6366f1"
                  strokeWidth="0.5"
                  strokeDasharray="1.5, 1"
                />

                {/* Dashed projections to axes */}
                <line
                  x1={mapX(triangle.x1)}
                  y1={mapY(triangle.y1)}
                  x2={marginL}
                  y2={mapY(triangle.y1)}
                  stroke="#6366f1"
                  strokeWidth="0.3"
                  strokeDasharray="1, 1"
                  opacity="0.7"
                />
                <line
                  x1={mapX(triangle.x2)}
                  y1={mapY(triangle.y2)}
                  x2={marginL}
                  y2={mapY(triangle.y2)}
                  stroke="#6366f1"
                  strokeWidth="0.3"
                  strokeDasharray="1, 1"
                  opacity="0.7"
                />
                <line
                  x1={mapX(triangle.x1)}
                  y1={mapY(triangle.y1)}
                  x2={mapX(triangle.x1)}
                  y2={marginT + gridH}
                  stroke="#6366f1"
                  strokeWidth="0.3"
                  strokeDasharray="1, 1"
                  opacity="0.7"
                />
                <line
                  x1={mapX(triangle.x2)}
                  y1={mapY(triangle.y2)}
                  x2={mapX(triangle.x2)}
                  y2={marginT + gridH}
                  stroke="#6366f1"
                  strokeWidth="0.3"
                  strokeDasharray="1, 1"
                  opacity="0.7"
                />

                {/* Vertex points */}
                <circle cx={mapX(triangle.x1)} cy={mapY(triangle.y1)} r="1" fill="#4f46e5" />
                <circle cx={mapX(triangle.x2)} cy={mapY(triangle.y2)} r="1" fill="#4f46e5" />

                {/* Delta labels */}
                <text
                  x={mapX((triangle.x1 + triangle.x2) / 2)}
                  y={mapY(triangle.y1) + 3}
                  textAnchor="middle"
                  fill="#4f46e5"
                  fontSize="2.6"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Δx = {triangle.dx.toFixed(3)}
                </text>
                <text
                  x={mapX(triangle.x2) + 2}
                  y={mapY((triangle.y1 + triangle.y2) / 2)}
                  textAnchor="start"
                  fill="#4f46e5"
                  fontSize="2.6"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Δy = {triangle.dy.toFixed(3)}
                </text>
              </g>
            )}

            {/* Error Bars */}
            {showErrorBars &&
              points.map((p, idx) => {
                const px = mapX(p.x);
                const py = mapY(p.y);
                const xErrMm = mmX(p.dx);
                const yErrMm = mmY(p.dy);
                const cap = 1.2;

                return (
                  <g key={`err-${idx}`}>
                    {/* X error bar */}
                    {p.dx > 0 && (
                      <>
                        <line
                          x1={px - xErrMm}
                          y1={py}
                          x2={px + xErrMm}
                          y2={py}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                        <line
                          x1={px - xErrMm}
                          y1={py - cap}
                          x2={px - xErrMm}
                          y2={py + cap}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                        <line
                          x1={px + xErrMm}
                          y1={py - cap}
                          x2={px + xErrMm}
                          y2={py + cap}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                      </>
                    )}

                    {/* Y error bar */}
                    {p.dy > 0 && (
                      <>
                        <line
                          x1={px}
                          y1={py - yErrMm}
                          x2={px}
                          y2={py + yErrMm}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                        <line
                          x1={px - cap}
                          y1={py - yErrMm}
                          x2={px + cap}
                          y2={py - yErrMm}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                        <line
                          x1={px - cap}
                          y1={py + yErrMm}
                          x2={px + cap}
                          y2={py + yErrMm}
                          stroke={c.errorBar}
                          strokeWidth="0.45"
                        />
                      </>
                    )}
                  </g>
                );
              })}

            {/* Data Points (drawn as crosses) */}
            {points.map((p, idx) => {
              const px = mapX(p.x);
              const py = mapY(p.y);
              const size = 1.6;

              return (
                <g key={`pt-${idx}`}>
                  <line
                    x1={px - size}
                    y1={py - size}
                    x2={px + size}
                    y2={py + size}
                    stroke={c.dataPoint}
                    strokeWidth="0.6"
                  />
                  <line
                    x1={px - size}
                    y1={py + size}
                    x2={px + size}
                    y2={py - size}
                    stroke={c.dataPoint}
                    strokeWidth="0.6"
                  />
                  <circle cx={px} cy={py} r="0.4" fill={c.dataPoint} />
                </g>
              );
            })}

            {/* Mean Point (x̄, ȳ) */}
            {showMeanPoint && points.length > 0 && (
              <g>
                <circle
                  cx={mapX(regression.meanX)}
                  cy={mapY(regression.meanY)}
                  r="2"
                  fill="none"
                  stroke={c.meanPoint}
                  strokeWidth="0.6"
                />
                <circle
                  cx={mapX(regression.meanX)}
                  cy={mapY(regression.meanY)}
                  r="0.7"
                  fill={c.meanPoint}
                />
                <text
                  x={mapX(regression.meanX) + 3}
                  y={mapY(regression.meanY) - 2}
                  fill={c.meanPoint}
                  fontSize="2.6"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  (x̄, ȳ)
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back: Uncertainty</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
        >
          <span>Continue to Step 5: Calculations</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
