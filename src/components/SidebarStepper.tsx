import React from 'react';
import {
  Sliders,
  Table2,
  Percent,
  LineChart,
  Calculator,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STEPS: StepItem[] = [
  { id: 1, label: '1. Setup', subtitle: 'Aim, Variables & Physics', icon: Sliders },
  { id: 2, label: '2. Data Sheet', subtitle: 'Spreadsheet & Repeats', icon: Table2 },
  { id: 3, label: '3. Uncertainties', subtitle: 'Means & Error Propagation', icon: Percent },
  { id: 4, label: '4. Graph Paper', subtitle: '180×250mm & Error Bars', icon: LineChart },
  { id: 5, label: '5. Calculations', subtitle: 'Regression & Results', icon: Calculator },
  { id: 6, label: '6. Final Report', subtitle: 'AI Sections & A4 Export', icon: FileText },
];

interface SidebarStepperProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  completedSteps: number[];
}

export const SidebarStepper: React.FC<SidebarStepperProps> = ({
  currentStep,
  onSelectStep,
  completedSteps,
}) => {
  return (
    <nav className="w-full lg:w-64 shrink-0 bg-slate-900/60 lg:border-r border-b lg:border-b-0 border-slate-800 p-3 lg:p-4">
      <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = completedSteps.includes(step.id);

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-slate-800 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                    : isDone
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                }`}
              >
                {isDone && !isActive ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                  <span className={isActive ? 'text-white font-bold' : ''}>{step.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate hidden lg:block">
                  {step.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
