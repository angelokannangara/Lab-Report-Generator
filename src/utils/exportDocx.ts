import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import { ExperimentConfig, FinalPhysicalResult, RegressionResult, ReportSections, StudentMeta, WorstFitResult } from '../types';

export async function generateDocxBlob(
  student: StudentMeta,
  experiment: ExperimentConfig,
  reportSections: ReportSections,
  regression: RegressionResult,
  worstFit: WorstFitResult,
  finalResult: FinalPhysicalResult,
  dataRows: any[],
  points: any[]
): Promise<Blob> {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: experiment.title || 'Physics Laboratory Report',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, before: 100 },
    })
  );

  // Student Meta Table
  const metaRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Student Name:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: student.studentName || 'Not Specified' })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: student.date || new Date().toLocaleDateString() })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Class / Course:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: student.classOrCourse || 'Physics' })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Lab Partner:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: student.labPartner || 'None' })] }),
      ],
    }),
  ];

  children.push(
    new Table({
      rows: metaRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // Helper for section headings
  const addSection = (title: string, bodyText: string) => {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    const paragraphs = (bodyText || 'No text provided.').split('\n\n');
    for (const p of paragraphs) {
      if (p.trim()) {
        children.push(
          new Paragraph({
            text: p.trim(),
            spacing: { after: 120 },
          })
        );
      }
    }
  };

  // Aim
  addSection('1. Aim of the Experiment', experiment.aim);

  // Apparatus
  addSection('2. Apparatus List', experiment.apparatus.map((a, i) => `${i + 1}. ${a}`).join('\n\n'));

  // Theory
  addSection('3. Theoretical Background', reportSections.theory || `Governing equation: ${experiment.theoreticalEquation}\nLinear form: ${experiment.linearEquation}`);

  // Methodology
  addSection('4. Experimental Procedure', reportSections.methodology);

  // Data & Regression Results Summary
  children.push(
    new Paragraph({
      text: '5. Mathematical Analysis & Regression',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      text: `Best-fit Gradient (m): ${regression.m.toFixed(4)} ± ${regression.se_m.toFixed(4)}`,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `Intercept (c): ${regression.c.toFixed(4)} ± ${regression.se_c.toFixed(4)}`,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `Coefficient of Determination (R²): ${regression.r2.toFixed(4)}`,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `Worst-fit uncertainty Δm: ${worstFit.deltaM.toFixed(4)}`,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `Determined ${experiment.targetQuantityName}: ${finalResult.formatted}`,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `Literature / Accepted Value: ${finalResult.acceptedValue} ${experiment.targetQuantityUnit} (${finalResult.percentDifference.toFixed(2)}% difference)`,
      spacing: { after: 160 },
    })
  );

  // Results & Discussion
  addSection('6. Results and Discussion', reportSections.resultsAndDiscussion);

  // Sources of Error
  addSection('7. Sources of Experimental Error', reportSections.sourcesOfError);

  // Precautions
  addSection('8. Experimental Precautions', reportSections.precautions);

  // Conclusion
  addSection('9. Conclusion', reportSections.conclusion);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
