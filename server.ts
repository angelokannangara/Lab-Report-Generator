import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to check for a valid Gemini API key
const hasValidGeminiKey = (): boolean => {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim() && apiKey !== 'MY_GEMINI_API_KEY');
};

// Initialize GoogleGenAI SDK on server side with process.env.GEMINI_API_KEY
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// High-fidelity academic report synthesis fallback when Gemini API key is pending
function buildAcademicReportFallback(
  experiment: any,
  regression: any,
  finalResult: any,
  worstFit: any,
  customInstructions?: string
) {
  const intro = `The primary objective of this laboratory investigation was ${
    experiment?.aim ? experiment.aim.toLowerCase() : 'to investigate the physical relationship between the variables'
  }. In experimental physics, verifying theoretical governing laws requires high-precision systematic measurements, rigorous regression analysis, and quantification of observational uncertainties. This report details the theoretical basis, experimental methodology, and statistical analysis conducted for "${experiment?.title || 'Physics Experiment'}".`;

  const theory = `Theoretical Background and Derivations:
The physical phenomenon under investigation is governed by the theoretical equation:
$$${experiment?.theoreticalEquation || 'y = f(x)'}$$

To enable linear least-squares analysis, this non-linear relationship is recast into the canonical straight-line form:
$$${experiment?.linearEquation || 'y = mx + c'}$$
where the dependent variable $y = ${experiment?.yAxisSymbol || 'y'}$ is plotted along the vertical ordinate, and the independent variable $x = ${experiment?.xAxisSymbol || 'x'}$ is plotted along the abscissa.

Physical Interpretation of Parameters:
- Gradient ($m$): ${experiment?.gradientMeaning || 'Represents the rate of change of the dependent variable with respect to the independent variable.'}
- Intercept ($c$): ${experiment?.interceptMeaning || 'Represents the theoretical baseline value when the independent variable is zero.'}

The target physical quantity ${experiment?.targetQuantityName} (${experiment?.targetQuantitySymbol}) is evaluated directly from the regression gradient using:
$$${experiment?.targetQuantityLatex || experiment?.targetQuantityFormulaFromGradient || 'm'}$$
with uncertainty propagated via standard partial derivative rules.`;

  const apparatus = `The experimental investigation was performed using the following apparatus:
${(experiment?.apparatus || []).map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}

All instruments were inspected for zero error, calibration markings, and environmental stability prior to taking repeated readings.`;

  const methodology = `Experimental Methodology:
1. The apparatus was assembled on a stable, vibration-free laboratory bench as specified in the standard laboratory manual.
2. Initial instrument zero errors and minimum scale resolutions (least counts) were inspected and recorded.
3. The independent variable was systematically incremented across the full allowable experimental range.
4. For each distinct setting, multiple repeat measurements of the dependent variable were recorded to minimize random observational errors.
5. Readings were tabulated systematically in the data sheet, and repeated readings were averaged using arithmetic mean evaluation.
6. Environmental conditions including temperature, ambient draft, and illumination were maintained constant throughout the trial sequence.`;

  const results = `Results and Graphical Discussion:
Linear regression performed on the experimental data points yielded the following parameters:
- Gradient ($m$): ${regression?.m !== undefined ? (typeof regression.m === 'number' ? regression.m.toFixed(5) : regression.m) : 'N/A'} ± ${regression?.se_m !== undefined ? (typeof regression.se_m === 'number' ? regression.se_m.toFixed(5) : regression.se_m) : 'N/A'}
- Intercept ($c$): ${regression?.c !== undefined ? (typeof regression.c === 'number' ? regression.c.toFixed(5) : regression.c) : 'N/A'} ± ${regression?.se_c !== undefined ? (typeof regression.se_c === 'number' ? regression.se_c.toFixed(5) : regression.se_c) : 'N/A'}
- Coefficient of Determination ($R^2$): ${regression?.r2 !== undefined ? (typeof regression.r2 === 'number' ? regression.r2.toFixed(5) : regression.r2) : 'N/A'}
- Worst-fit gradient uncertainty ($\Delta m$): ±${worstFit?.deltaM !== undefined ? (typeof worstFit.deltaM === 'number' ? worstFit.deltaM.toFixed(5) : worstFit.deltaM) : '0.00000'}

The correlation coefficient confirms the linear relationship between ${experiment?.xAxisSymbol || 'x'} and ${experiment?.yAxisSymbol || 'y'}, in accordance with theoretical predictions.

The calculated value of ${experiment?.targetQuantityName || 'Target Quantity'} (${experiment?.targetQuantitySymbol || 'Q'}) was determined to be:
$$${experiment?.targetQuantitySymbol || 'Q'} = ${finalResult?.formatted || finalResult?.value || 'N/A'}$$

Comparison with Literature:
The accepted standard literature value is ${finalResult?.acceptedValue} ${experiment?.targetQuantityUnit || ''}. The percentage discrepancy is ${finalResult?.percentDifference !== undefined ? (typeof finalResult.percentDifference === 'number' ? finalResult.percentDifference.toFixed(2) : finalResult.percentDifference) : '0'}%. ${finalResult?.agreesWithinUncertainty ? 'The experimental result agrees with the accepted literature value within experimental uncertainty bounds.' : 'The experimental result displays minor divergence relative to accepted literature, attributable to residual systematic apparatus limitations.'}`;

  const sourcesOfError = `Sources of Experimental Error:
1. Systematic Errors:
   - Instrument calibration and zero offset errors in measuring devices (least count limitations).
   - Physical approximations in theoretical assumptions (e.g. wall effects in Stoke's viscosity, end corrections in metre bridges, or small-angle assumptions).
   - Ambient thermal drift and room temperature fluctuations affecting material properties.

2. Random Errors:
   - Parallax error during manual optical alignment and scale reading.
   - Human reaction time delay in initiating and stopping digital stopwatches (typically ±0.1 to ±0.2 s).
   - Residual mechanical vibrations or air convection currents around the apparatus.`;

  const precautions = `Experimental Precautions:
1. Parallax errors were avoided by positioning the eye perpendicularly to all linear scales and pointer indicators.
2. For each measurement point, multiple independent readings were acquired and averaged to reduce statistical spread.
3. The apparatus was securely clamped to prevent wobbling or shifting during measurement cycles.
4. Electronic equipment was allowed to warm up and thermalize prior to recording electrical measurements.
5. The zero readings of micrometers and vernier calipers were verified before and after each measurement sequence.`;

  const conclusion = `Conclusion:
The investigation successfully verified the linear theoretical relationship between ${experiment?.xAxisSymbol || 'x'} and ${experiment?.yAxisSymbol || 'y'}. Using deterministic least-squares regression, the final value of ${experiment?.targetQuantityName || 'Target Quantity'} was determined to be:
$$${experiment?.targetQuantitySymbol || 'Q'} = ${finalResult?.formatted || finalResult?.value || 'N/A'}$$
This result ${finalResult?.agreesWithinUncertainty ? 'agrees within observational uncertainty' : 'is in close proximity'} with the accepted standard literature value of ${finalResult?.acceptedValue} ${experiment?.targetQuantityUnit || ''} (${finalResult?.percentDifference !== undefined ? (typeof finalResult.percentDifference === 'number' ? finalResult.percentDifference.toFixed(2) : finalResult.percentDifference) : '0'}% difference).`;

  return {
    introduction: intro,
    theory,
    apparatus,
    methodology,
    resultsAndDiscussion: results,
    sourcesOfError,
    precautions,
    conclusion,
  };
}

function generateChatFallback(query: string, experiment: any, regression: any, finalResult: any): string {
  const q = (query || '').toLowerCase();
  if (q.includes('error') || q.includes('systematic') || q.includes('random')) {
    return `### Systematic & Random Errors in ${experiment?.title || 'this experiment'}:\n\n` +
      `1. **Systematic Calibration & Zero Errors**:\n` +
      `   - Instrument minimum resolution (least count) for apparatus.\n` +
      `   - Theoretical approximations: boundary conditions (e.g., wall effects in cylinder, end corrections on wire bridge, or small-angle assumptions for pendulums).\n\n` +
      `2. **Random Observational Errors**:\n` +
      `   - Parallax errors during optical and rule scale alignments.\n` +
      `   - Human reflex latency in stopwatch triggers (typically $\\approx \\pm 0.15\\text{ s}$).\n\n` +
      `*Tip: To minimize fractional uncertainty, repeat each trial at least 3–5 times and calculate the arithmetic mean $\\bar{x}$.*`;
  }

  if (q.includes('literature') || q.includes('accepted') || q.includes('constant') || q.includes('value')) {
    return `### Accepted Literature Value for ${experiment?.targetQuantityName || 'target quantity'}:\n\n` +
      `- **Target Quantity**: ${experiment?.targetQuantityName} (${experiment?.targetQuantitySymbol})\n` +
      `- **Standard Literature Value**: **${finalResult?.acceptedValue} ${experiment?.targetQuantityUnit || ''}**\n` +
      `- **Your Determined Value**: **${finalResult?.formatted || 'Pending'}**\n` +
      `- **Discrepancy**: ${finalResult?.percentDifference !== undefined ? (typeof finalResult.percentDifference === 'number' ? finalResult.percentDifference.toFixed(2) : finalResult.percentDifference) : '0'}%\n\n` +
      `**Agreement Assessment**: ${finalResult?.agreesWithinUncertainty ? 'Your value agrees with the accepted standard within the uncertainty margin $\\pm \\Delta ' + (experiment?.targetQuantitySymbol || 'Q') + '$.' : 'The value displays a slight deviation exceeding uncertainty, indicating possible residual systematic bias (e.g., damping or zero error).'}`;
  }

  if (q.includes('gradient') || q.includes('slope') || q.includes('law') || q.includes('intercept') || q.includes('matches')) {
    return `### Linear Regression Analysis:\n\n` +
      `- **Governing Formula**: $$${experiment?.theoreticalEquation || 'y = f(x)'}$$\n` +
      `- **Linear Transformation**: $$${experiment?.linearEquation || 'y = mx + c'}$$\n` +
      `- **Gradient $m$**: **${regression?.m !== undefined ? (typeof regression.m === 'number' ? regression.m.toFixed(5) : regression.m) : 'N/A'} $\\pm$ ${regression?.se_m !== undefined ? (typeof regression.se_m === 'number' ? regression.se_m.toFixed(5) : regression.se_m) : 'N/A'}**\n` +
      `- **Physical Meaning**: ${experiment?.gradientMeaning || 'Relates the slope directly to physical constants.'}\n` +
      `- **Intercept $c$**: **${regression?.c !== undefined ? (typeof regression.c === 'number' ? regression.c.toFixed(5) : regression.c) : 'N/A'}** (${experiment?.interceptMeaning || 'Baseline offset'})\n` +
      `- **Fit Quality ($R^2$)**: **${regression?.r2 !== undefined ? (typeof regression.r2 === 'number' ? regression.r2.toFixed(4) : regression.r2) : 'N/A'}**`;
  }

  if (q.includes('reaction') || q.includes('timing') || q.includes('human')) {
    return `### Minimizing Human Timing & Reaction Errors:\n\n` +
      `1. **Count Multiples**: Instead of timing a single event, time a multiple (e.g., 20 or 50 oscillations for a pendulum, or 5 drops in viscosity). The reaction time uncertainty $\\Delta t \\approx 0.2\\text{ s}$ is then divided by 20, reducing its relative effect by a factor of 20.\n` +
      `2. **Fiducial Mark**: Measure passage across a distinct fiducial line at maximum speed where position change is sharpest, rather than at endpoints where the velocity passes through zero.\n` +
      `3. **Repeated Trials**: Perform at least 3 trials per setting and use the arithmetic mean.`;
  }

  return `### Physics Assistant Guidance for "${experiment?.title || 'Experiment'}":\n\n` +
    `Governing Theoretical Law:\n` +
    `$$${experiment?.theoreticalEquation || 'y = f(x)'}$$\n\n` +
    `Linear Form ($y = mx + c$):\n` +
    `$$${experiment?.linearEquation || 'y = mx + c'}$$\n\n` +
    `- **Determined Result**: $${experiment?.targetQuantitySymbol || 'Q'} = ${finalResult?.formatted || 'Pending'}$ (Accepted: ${finalResult?.acceptedValue} ${experiment?.targetQuantityUnit || ''})\n` +
    `- **Regression Quality**: $R^2 = ${regression?.r2 !== undefined ? (typeof regression.r2 === 'number' ? regression.r2.toFixed(4) : regression.r2) : 'N/A'}$\n\n` +
    `Feel free to ask about specific error sources, how to propagate uncertainties with partial derivatives, or procedural techniques for your apparatus!`;
}

// 1. One-shot structured report generation
app.post('/api/gemini/generate-sections', async (req, res) => {
  try {
    const { experiment, regression, finalResult, worstFit, customInstructions, model: requestedModel } = req.body;

    const ai = getAiClient();
    if (!ai) {
      const fallbackSections = buildAcademicReportFallback(
        experiment,
        regression,
        finalResult,
        worstFit,
        customInstructions
      );
      return res.json({ success: true, sections: fallbackSections, isFallback: true });
    }

    const model = requestedModel || 'gemini-3.8-flash';

    const systemPrompt = `You are a strict, professional academic physics laboratory report assistant.
CORE RULES:
1. Use ONLY the experimental values, measured quantities, and calculations provided in the prompt.
2. DO NOT invent, extrapolate, or alter any numbers or data points.
3. DO NOT recalculate numbers. The calculations provided were computed deterministically by verified algorithms.
4. Use formal scientific English:
   - For Methodology / Procedure: MUST use PASSIVE VOICE and past tense (e.g., "The length was measured using...", "A mass was suspended..."). Never use personal pronouns such as "I", "we", "my", or "our".
   - For Theory: Explain the physical laws from first principles, show mathematical derivations using KaTeX/LaTeX formatting (e.g. $T = 2\\pi\\sqrt{L/g}$), and explain how the linear graph form $y = mx + c$ maps to the physical constants.
   - For Results and Discussion: Analyze the linear fit, gradient, intercept, standard errors, comparison with accepted value, and percentage difference.
   - For Sources of Error: Detail specific systematic and random errors pertinent to the actual apparatus and physical instruments used.
   - For Precautions: Realistic experimental precautions taken during the laboratory session.
   - For Conclusion: Concise statement of the final result with uncertainty and agreement within experimental error.
5. Return structured JSON matching the requested schema.`;

    const userPrompt = `Generate a complete, formal physics laboratory report text for the following experiment:
Title: ${experiment.title}
Aim: ${experiment.aim}
Apparatus: ${JSON.stringify(experiment.apparatus)}
Theoretical Equation: ${experiment.theoreticalEquation}
Linear Equation: ${experiment.linearEquation}
X-axis: ${experiment.xAxisSymbol}, Y-axis: ${experiment.yAxisSymbol}
Physical meaning of gradient: ${experiment.gradientMeaning}
Physical meaning of intercept: ${experiment.interceptMeaning}
Calculated Gradient (m): ${regression.m} ± ${regression.se_m}
Calculated Intercept (c): ${regression.c} ± ${regression.se_c}
Correlation R²: ${regression.r2}
Worst-fit delta m: ${worstFit?.deltaM ?? 'N/A'}
Final Determined Physical Quantity: ${experiment.targetQuantityName} (${experiment.targetQuantitySymbol}) = ${finalResult?.formatted || finalResult?.value}
Accepted / Literature Value: ${finalResult?.acceptedValue} ${experiment.targetQuantityUnit}
Percentage Difference: ${finalResult?.percentDifference?.toFixed(2)}%
Agrees within uncertainty: ${finalResult?.agreesWithinUncertainty ? 'Yes' : 'No'}
Additional user guidance: ${customInstructions || 'None'}

Please construct each of the following sections:
- introduction
- theory
- apparatus
- methodology
- resultsAndDiscussion
- sourcesOfError
- precautions
- conclusion`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            introduction: { type: Type.STRING },
            theory: { type: Type.STRING },
            apparatus: { type: Type.STRING },
            methodology: { type: Type.STRING },
            resultsAndDiscussion: { type: Type.STRING },
            sourcesOfError: { type: Type.STRING },
            precautions: { type: Type.STRING },
            conclusion: { type: Type.STRING },
          },
          required: [
            'introduction',
            'theory',
            'apparatus',
            'methodology',
            'resultsAndDiscussion',
            'sourcesOfError',
            'precautions',
            'conclusion',
          ],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json({ success: true, sections: parsed });
  } catch (error: any) {
    console.error('Error generating report sections with Gemini:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate report sections with Gemini API.',
    });
  }
});

// 2. Real-time streaming report generation (Server-Sent Events)
app.post('/api/gemini/stream-report', async (req, res) => {
  try {
    const { experiment, regression, finalResult, worstFit, customInstructions, model: requestedModel } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const ai = getAiClient();
    if (!ai) {
      const fallback = buildAcademicReportFallback(
        experiment,
        regression,
        finalResult,
        worstFit,
        customInstructions
      );
      const fullMarkdown = `## 1. Introduction\n${fallback.introduction}\n\n## 2. Theory & Derivations\n${fallback.theory}\n\n## 3. Apparatus List\n${fallback.apparatus}\n\n## 4. Experimental Methodology\n${fallback.methodology}\n\n## 5. Results and Discussion\n${fallback.resultsAndDiscussion}\n\n## 6. Sources of Experimental Error\n${fallback.sourcesOfError}\n\n## 7. Experimental Precautions\n${fallback.precautions}\n\n## 8. Conclusion\n${fallback.conclusion}`;

      const words = fullMarkdown.split(/(\s+)/);
      for (let i = 0; i < words.length; i += 6) {
        const chunk = words.slice(i, i + 6).join('');
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const model = requestedModel || 'gemini-3.8-flash';

    const systemPrompt = `You are a real-time academic physics report writer.
Output markdown text structured with standard headers:
## 1. Introduction
## 2. Theory & Derivations
## 3. Apparatus List
## 4. Experimental Methodology (Procedure in PASSIVE VOICE past tense, NO "I/we")
## 5. Results and Discussion (Referencing the provided regression numbers)
## 6. Sources of Experimental Error (Systematic vs Random)
## 7. Experimental Precautions
## 8. Conclusion

Rules:
- NEVER invent or alter numerical values. Use strictly the provided gradient m, intercept c, R², and final quantity.
- Write in academic English suitable for university physics reports.`;

    const userPrompt = `Stream the full laboratory report for:
Experiment: ${experiment.title}
Aim: ${experiment.aim}
Apparatus: ${JSON.stringify(experiment.apparatus)}
Theoretical Equation: ${experiment.theoreticalEquation}
Linear Form: ${experiment.linearEquation}
Calculated Gradient (m): ${regression.m} ± ${regression.se_m}
Calculated Intercept (c): ${regression.c} ± ${regression.se_c}
Correlation R²: ${regression.r2}
Worst-Fit delta m: ${worstFit?.deltaM ?? 'N/A'}
Final Result: ${experiment.targetQuantityName} (${experiment.targetQuantitySymbol}) = ${finalResult?.formatted}
Literature Accepted Value: ${finalResult?.acceptedValue} ${experiment.targetQuantityUnit} (${finalResult?.percentDifference?.toFixed(2)}% difference)
Agrees within uncertainty: ${finalResult?.agreesWithinUncertainty ? 'Yes' : 'No'}
User Instructions: ${customInstructions || 'Provide full academic depth.'}`;

    const responseStream = await ai.models.generateContentStream({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming report error:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming failed.' })}\n\n`);
    res.end();
  }
});

// 3. Multi-turn AI Physics Chatbot with Search Grounding
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, experiment, regression, finalResult, useSearchGrounding, model: requestedModel } = req.body;

    const ai = getAiClient();
    if (!ai) {
      const lastUserMsg = (messages || []).filter((m: any) => m.role === 'user').pop()?.content || '';
      const reply = generateChatFallback(lastUserMsg, experiment, regression, finalResult);
      return res.json({ success: true, reply });
    }

    // Default model: gemini-3.8-flash for general STEM chat, gemini-4-argon for deep derivation if requested
    const model = requestedModel || 'gemini-3.8-flash';

    const systemInstruction = `You are "Lab Assistant AI", an expert physicist and academic laboratory supervisor specialized in experimental physics, measurement uncertainty, instrument calibrations, and error analysis.

Current Experiment Context:
- Title: ${experiment?.title || 'Physics Experiment'}
- Aim: ${experiment?.aim || 'N/A'}
- Theoretical Equation: ${experiment?.theoreticalEquation || 'N/A'}
- Linear Form: ${experiment?.linearEquation || 'N/A'}
- Regression Gradient (m): ${regression?.m ? `${regression.m.toFixed(5)} ± ${regression.se_m?.toFixed(5)}` : 'Pending'}
- Regression Intercept (c): ${regression?.c ? `${regression.c.toFixed(5)} ± ${regression.se_c?.toFixed(5)}` : 'Pending'}
- Correlation R²: ${regression?.r2 ? regression.r2.toFixed(5) : 'Pending'}
- Final Determined Value: ${finalResult?.formatted || 'Pending'}
- Accepted Literature Value: ${finalResult?.acceptedValue || 'N/A'} ${experiment?.targetQuantityUnit || ''}

Your roles:
1. Provide real-time scientific guidance, explain physical laws, and derive formulas in KaTeX format ($...$ and $$...$$).
2. Advise on experimental techniques, instrument resolutions/least counts, and parallax errors.
3. Help diagnose why the experimental result might deviate from literature (systematic zero errors, damping, friction, end corrections).
4. If search grounding is active, look up verified literature physical constants and materials properties.
5. Keep your tone encouraging, rigorous, and academically precise.`;

    // Convert messages to GoogleGenAI format
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const config: any = {
      systemInstruction,
    };

    // Add Google Search grounding if requested
    if (useSearchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const replyText = response.text || 'I could not generate a response. Please rephrase your question.';
    const searchChunks = (response.candidates?.[0]?.groundingMetadata as any)?.groundingChunks || [];
    const searchQueries = (response.candidates?.[0]?.groundingMetadata as any)?.webSearchQueries || [];

    res.json({
      success: true,
      reply: replyText,
      grounding: {
        chunks: searchChunks,
        queries: searchQueries,
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Chatbot encountered an error.',
    });
  }
});

// 4. Single section regeneration
app.post('/api/gemini/generate-single-section', async (req, res) => {
  try {
    const { sectionKey, currentText, experiment, regression, finalResult, instruction, model: requestedModel } = req.body;

    const ai = getAiClient();
    if (!ai) {
      const fallback = buildAcademicReportFallback(experiment, regression, finalResult, null, instruction);
      const text = (fallback as Record<string, string>)[sectionKey] || currentText;
      return res.json({ success: true, revisedText: text });
    }

    const model = requestedModel || 'gemini-3.8-flash';

    const prompt = `You are a physics lab report specialist.
Rewrite or refine the "${sectionKey}" section for this physics experiment:
Experiment: ${experiment.title}
Theoretical Equation: ${experiment.theoreticalEquation}
Gradient (m): ${regression?.m} ± ${regression?.se_m}
Final Quantity: ${finalResult?.formatted}
Current Text:
"""
${currentText || ''}
"""
Specific Instruction for revision: ${instruction || 'Refine and improve clarity while keeping strictly to facts and numbers provided.'}

Requirements:
- Passive voice and past tense for methodology (never "I" or "we").
- Keep all computed numbers accurate to the provided values.
- Do not invent new data.
- Return only the revised section text as a plain string in JSON with key "revisedText".`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            revisedText: { type: Type.STRING },
          },
          required: ['revisedText'],
        },
      },
    });

    const jsonText = response.text || '{"revisedText": ""}';
    const parsed = JSON.parse(jsonText);
    res.json({ success: true, revisedText: parsed.revisedText });
  } catch (error: any) {
    console.error('Error generating single section:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to regenerate section.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Vite middleware mounting in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Lab Report Studio server listening on port ${port}`);
  });
}

startServer();
