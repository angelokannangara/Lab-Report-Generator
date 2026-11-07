export type UncertaintyMethod = 'half_range' | 'std_error' | 'least_count_only';

export interface VariableDef {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  instrument: string;
  leastCount: number;
  axis?: 'x' | 'y' | 'none';
}

export interface ComputedColumnDef {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  formula: string; // e.g., "t / 20" or "T^2"
  axis?: 'x' | 'y' | 'none';
  propagationRule?: string; // explanatory text or auto-derived
}

export interface DataRow {
  id: string;
  // Raw readings: maps variable id -> array of repeat numbers (e.g. [19.8, 19.9, 19.7])
  readings: Record<string, number[]>;
  // Manual overrides or auxiliary notes if needed
  notes?: string;
}

export interface ExperimentConfig {
  id: string;
  title: string;
  aim: string;
  apparatus: string[];
  theoreticalEquation: string; // e.g. "T^2 = (4\pi^2 / g) L"
  linearEquation: string; // e.g. "y = mx + c"
  xAxisSymbol: string;
  yAxisSymbol: string;
  gradientMeaning: string; // e.g. "m = 4\pi^2 / g"
  interceptMeaning: string; // e.g. "c = 0 (ideal)"
  targetQuantityName: string; // e.g. "Acceleration due to gravity (g)"
  targetQuantitySymbol: string; // e.g. "g"
  targetQuantityUnit: string; // e.g. "m s^-2"
  targetQuantityFormulaFromGradient: string; // e.g. "4 * pi^2 / m"
  targetQuantityLatex: string; // e.g. "g = \frac{4\pi^2}{m}"
  acceptedValue: number; // e.g. 9.80665 or 9.81
  uncertaintyMethod: UncertaintyMethod;
  startAxesAtZero: boolean;
  variables: VariableDef[];
  computedColumns: ComputedColumnDef[];
}

export interface ProcessedPoint {
  index: number;
  rawRowId: string;
  x: number;
  y: number;
  dx: number; // absolute uncertainty in x
  dy: number; // absolute uncertainty in y
  xRelPercent: number;
  yRelPercent: number;
}

export interface RegressionResult {
  m: number; // gradient
  c: number; // intercept
  r2: number; // coefficient of determination
  r: number;
  se_m: number; // standard error of slope
  se_c: number; // standard error of intercept
  sumX: number;
  sumY: number;
  sumXY: number;
  sumX2: number;
  sumY2: number;
  n: number;
  meanX: number;
  meanY: number;
  weighted: boolean;
}

export interface WorstFitLine {
  label: string;
  m: number;
  c: number;
  color: string;
  type: 'max' | 'min';
}

export interface WorstFitResult {
  maxLine: WorstFitLine;
  minLine: WorstFitLine;
  deltaM: number; // (m_max - m_min) / 2
  deltaC: number;
  methodDescription: string;
}

export interface GradientTriangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  gradient: number;
}

export interface GridScale {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xSpan: number;
  ySpan: number;
  xRawPerMm: number;
  yRawPerMm: number;
  xScalePerMm: number; // rounded up to 1, 2, or 5 * 10^n
  yScalePerMm: number;
  xUnitsPerCm: number;
  yUnitsPerCm: number;
  xMajorInterval: number; // value units per 10 mm
  yMajorInterval: number;
  xTicks: { value: number; mm: number; label: string }[];
  yTicks: { value: number; mm: number; label: string }[];
  widthMm: number; // 180 mm standard
  heightMm: number; // 250 mm standard
}

export interface FinalPhysicalResult {
  value: number;
  uncertainty: number;
  percentUncertainty: number;
  formatted: string; // e.g. "9.78 ± 0.15 m s^-2"
  acceptedValue: number;
  percentDifference: number;
  agreesWithinUncertainty: boolean;
}

export interface ReportSections {
  introduction: string;
  theory: string;
  apparatus: string;
  methodology: string;
  resultsAndDiscussion: string;
  sourcesOfError: string;
  precautions: string;
  conclusion: string;
}

export interface StudentMeta {
  studentName: string;
  classOrCourse: string;
  date: string;
  labPartner: string;
  institution: string;
}

export interface FullReportState {
  version: number;
  student: StudentMeta;
  experiment: ExperimentConfig;
  dataRows: DataRow[];
  reportSections: ReportSections;
  model: string;
  graphStyle: 'paper' | 'clean';
  showErrorBars: boolean;
  showWorstFit: boolean;
  showTriangle: boolean;
  showMeanPoint: boolean;
}
