# Lab Report Studio 🔬📐

> **Automated Physics Laboratory Reports with Deterministic Numerical Analysis & Real-Time AI Academic Synthesis**

**Lab Report Studio** is a full-featured web application built for school, college, and university physics students, educators, and laboratory supervisors. It bridges the gap between empirical laboratory measurements, rigorous statistical error propagation, authentic millimeter-grid graphical analysis, and formal academic report writing.

---

## 🌟 Core Philosophy: Deterministic Computation First

A strict physical and pedagogical rule governs **Lab Report Studio**:

> **All calculations (means, standard deviations, error propagation, least-squares regression, worst-fit lines, scale rounding, and percentage differences) are computed deterministically in verified TypeScript code — NEVER by generative AI.**

The Gemini AI model is employed strictly for synthesizing formal academic scientific literature (Theory, Methodology, Error Analysis, Discussion, and Conclusion) using the pre-calculated, verified numerical values provided as immutable inputs.

---

## 🚀 Key Features

### 1. Step-by-Step 6-Stage Laboratory Workflow
1. **Experiment Setup & Physics Theory**:
   - Define Experiment Title, Aim, Apparatus list with instrument resolutions, and governing physical law.
   - Real-time equation rendering powered by **KaTeX**.
   - Straight-line transformation mapping: $y = mx + c$, with physical definitions for gradient $m$ and intercept $c$.
   - Target physical quantity definition (symbol, unit, calculation formula from slope, accepted literature value).

2. **Editable Data Sheet**:
   - Interactive spreadsheet-style table supporting multiple repeat readings per setting (e.g. 3 trials for 20 oscillations).
   - Dynamic computed columns defined via mathematical formulas (e.g., `t / 20`, `T^2`, `1 / R`, `sin(theta)`).
   - One-click copy/paste from Excel or CSV files.
   - Comprehensive input validation and real-time syntax checking.

3. **Statistical Uncertainty & Significant Figures**:
   - Evaluation of arithmetic means, data ranges, and absolute uncertainties using selectable methods (**Half-Range** or **Standard Error of the Mean**).
   - Instrument least-count threshold enforcement ($\Delta x \ge \text{Least Count}$).
   - Propagation of uncertainties through powers, products, sums, and quotients using partial-derivative rules.
   - **Academic Significant Figure Rules**: Uncertainties formatted to 1 significant figure (or 2 if the leading digit is 1); measured values rounded to match the uncertainty decimal position.

4. **Authentic $180 \times 250\text{ mm}$ Graph Paper Plot**:
   - Precision custom SVG drawing mimicking real millimeter graph paper (1 mm fine lines, 5 mm intermediate lines, 10 mm bold lines).
   - **Scale Algorithm**: Evaluates raw scale $= \Delta / 180\text{ mm}$ and rounds **UP** to convenient intervals: $1$, $2$, or $5 \times 10^n$ per square ($10$, $20$, $50$ per cm).
   - Data points plotted with crisp crosshairs ($+$) and two-dimensional error bars ($\Delta x, \Delta y$).
   - Distinct Centroid Mean Point mark: $(\bar{x}, \bar{y})$.
   - **Least-Squares Best-Fit Line** traversing the data span.
   - **Centroid-Pivot Worst-Fit Lines** (Maximum and Minimum plausible gradients passing through error bars) calculating $\Delta m = \frac{m_{\max} - m_{\min}}{2}$.
   - **Gradient Triangle**: Selects two widely separated points along the line ($>50\%$ span) with dashed projection lines to axes and explicit slope calculation.
   - Visual switch between "Paper Style" (orange/green laboratory grid) and "Clean Digital Style".
   - Vector SVG and High-Res PNG download buttons.

5. **Full Step-by-Step Calculations with KaTeX**:
   - Complete unweighted and weighted least-squares regression working ($m, c, R^2, SE_m, SE_c$).
   - Full substitution of numerical values into the target physical equation (e.g., $g = \frac{4\pi^2}{m}$, $\eta = \frac{2(\rho - \sigma)g}{9m}$).
   - Percentage difference comparison against accepted literature values.
   - Automated physical agreement determination within observational uncertainty bounds.

6. **AI-Assisted Formal Academic Lab Report**:
   - **Real-Time Streaming Generation**: Live Server-Sent Events (SSE) streaming with interactive typewriter terminal preview.
   - **Passive Voice & Past Tense Enforcement**: Academic third-person methodology without personal pronouns ("I", "we").
   - Individual section regeneration and prompt tweaking ("focus more on parallax", "make it more concise").
   - Print-ready A4 preview layout.
   - Direct export to Microsoft Word (`.docx`) with styled tables, metadata, and regression summaries.
   - Standard browser Print to PDF formatting.

---

### 2. University Physics Laboratory Manual Presets
Includes comprehensive presets with prefilled aims, equipment, theoretical formulas, variables, and sample datasets from the **University Physics Laboratory Manual (USJP Semester 2)**:

| Experiment Code | Title | Target Quantity / Relationship |
|---|---|---|
| **Exp 01** | Refractive Indices of Glass & Liquid | Refractive Index ($\mu$) via Traveling Microscope |
| **Exp 02** | Determination of Viscosity (Stoke's Method) | Dynamic Viscosity ($\eta$) from $v_t$ vs. $r^2$ |
| **Exp 03** | Resistivity of a Wire (Metre Bridge) | Resistivity ($\rho$) with end corrections $\alpha, \beta$ |
| **Exp 05** | Deflection Magnetometer | Magnetic Moment ($M$) via $(\cot\theta)^{2/3}$ vs. $d^2$ |
| **Exp 07** | Voltage Regulation & Diode Rectification | Zener breakdown voltage & full-wave bridge ripple |
| **Exp 08** | Operational Amplifier UA741 Characteristics | Inverting & Non-Inverting closed-loop gains |
| **Exp 09** | Bifilar Suspension | Moment of Inertia ($I$) from $T^2$ vs. $l$ |
| **Exp 10** | Determination of Planck's Constant ($h$) | Photoelectric stopping potential $V_0$ vs. $1/\lambda$ |
| **Exp 10B** | Determination of Boltzmann Constant ($k_B$) | $\ln I$ vs. $V$ across forward-biased p-n junction |
| **Classic** | Simple Pendulum | Acceleration due to gravity ($g$) from $T^2$ vs. $L$ |
| **Classic** | Hooke's Law | Spring Constant ($k$) from $F$ vs. $x$ |
| **Classic** | Ohm's Law | Electrical Resistance ($R$) from $V$ vs. $I$ |
| **Classic** | Young's Modulus | Elastic Modulus ($Y$) using Searle's apparatus |

---

### 3. Real-Time AI Physics Assistant Chatbot (`AiChatbot`)
- Floating drawer accessible on any step of the investigation.
- Context-aware: automatically receives active experiment variables, regression slope, intercept, and literature values.
- Multi-turn conversation powered by the Gemini API (`@google/genai`).
- **Google Search Grounding** toggle for real-time verification of physical constants, standard densities, and literature reference values.
- Supported models:
  - `gemini-3.8-flash` (Recommended Default)
  - `gemini-3.1-flash-lite` (Ultra-low latency)
  - `gemini-4-argon` (Complex derivations and advanced physics theory)

---

### 4. Storage & Portability
- **Auto-Save**: Active experiment state automatically preserved in `localStorage`.
- **Named Reports**: Save and switch between multiple named laboratory sessions.
- **JSON Import / Export**: Share complete experiments, data tables, and AI report sections as portable JSON files.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Node.js, Express, TSX.
- **AI Integration**: `@google/genai` TypeScript SDK (Server-Side proxy with Google Search Grounding).
- **Mathematical Rendering**: KaTeX (`katex`).
- **Document Export**: `docx` (Word document generation), native print styles (PDF).
- **Testing**: Node.js native test runner (`node:test`, `tsx --test`).

---

## 📦 Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- npm or pnpm

### Installation
1. Clone the repository or navigate to the project directory:
   ```bash
   cd lab-report-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Provide your Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```
   *(Note: The server includes high-fidelity academic fallback synthesis if an API key is not yet configured, ensuring zero-downtime offline demonstrations).*

4. Start the Development Server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## 🧪 Testing

Run the deterministic mathematical test suite:
```bash
npm run test
```
Or directly with the Node.js test runner:
```bash
npx tsx --test src/utils/unitTests.test.ts
```

The test suite validates:
- Significant figures formatting (1 sig fig / 2 if leading digit is 1, decimal matching).
- Formula parsing and evaluation (`t/20`, `T^2`, `sin`, `sqrt`, `ln`).
- Mean, range, and standard error of the mean calculations.
- Uncertainty propagation rules for composite expressions.
- Unweighted and weighted least-squares regression parameters.
- Scale calculation and millimeter-grid snapping logic.
- Worst-fit line centroid pivoting and gradient triangle calculations.

---

## 📂 Project Structure

```
├── server.ts                    # Express server (Gemini API proxy, SSE streaming, Chatbot)
├── src/
│   ├── components/
│   │   ├── AiChatbot.tsx        # Multi-turn conversational AI physics supervisor
│   │   ├── KaTeXView.tsx        # LaTeX equation rendering component
│   │   ├── Navbar.tsx           # Global navigation, presets selector, save/load modal
│   │   ├── SidebarStepper.tsx   # 6-step progress sidebar
│   │   ├── Step1Setup.tsx       # Experiment setup, theory, apparatus & least counts
│   │   ├── Step2DataSheet.tsx   # Interactive spreadsheet & repeat trials
│   │   ├── Step3Uncertainty.tsx # Uncertainty analysis & significant figures
│   │   ├── Step4Graph.tsx       # 180x250 mm SVG graph paper, error bars, worst fit
│   │   ├── Step5Calculations.tsx# Linear regression & substituted formulas
│   │   └── Step6Report.tsx      # Real-time streaming report, A4 preview & export
│   ├── types/
│   │   └── index.ts             # Comprehensive TypeScript interface definitions
│   ├── utils/
│   │   ├── exportDocx.ts        # Native Microsoft Word (.docx) report generator
│   │   ├── math.ts              # Formula evaluator & academic sig fig formatter
│   │   ├── presets.ts           # 10 university manual experiments & classic labs
│   │   ├── regression.ts        # Least-squares linear regression (unweighted/weighted)
│   │   ├── scale.ts             # 180x250 mm graph paper scale determination algorithm
│   │   ├── uncertainty.ts       # Repeat statistics & error propagation engine
│   │   ├── worstFit.ts          # Centroid-pivot worst-fit lines & gradient triangle
│   │   └── unitTests.test.ts    # Test suite for all deterministic logic
│   ├── App.tsx                  # Root application controller & state coordinator
│   └── main.tsx                 # Client entry point
├── package.json
└── tsconfig.json
```

---

## 📄 License
Apache-2.0 License. See the source files for license details.
