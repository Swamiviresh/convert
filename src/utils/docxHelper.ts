import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  AlignmentType,
} from 'docx';

/**
 * Generate a proper .docx file from extracted text paragraphs.
 * Uses the docx library to create a valid Office Open XML document.
 */
export async function generateDocx(paragraphs: string[]): Promise<Blob> {
  const docParagraphs: Paragraph[] = [];

  for (const text of paragraphs) {
    if (!text.trim()) continue;

    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: text.trim(),
            size: 24, // 12pt
            font: 'Calibri',
          }),
        ],
        spacing: { after: 200 },
        alignment: AlignmentType.LEFT,
      })
    );
  }

  // If no content was extracted, add a placeholder
  if (docParagraphs.length === 0) {
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(No text content could be extracted from the PDF)',
            italics: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docParagraphs,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * Generate a DOCX with headings and body paragraphs.
 * Used when we can distinguish headings from body text.
 */
export async function generateDocxWithStructure(
  sections: Array<{ text: string; isHeading: boolean; level?: number }>
): Promise<Blob> {
  const docParagraphs: Paragraph[] = [];

  for (const section of sections) {
    if (!section.text.trim()) continue;

    if (section.isHeading) {
      const headingLevel =
        section.level === 1
          ? HeadingLevel.HEADING_1
          : section.level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;

      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.text.trim(),
              font: 'Calibri',
            }),
          ],
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        })
      );
    } else {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.text.trim(),
              size: 24,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 200 },
          alignment: AlignmentType.LEFT,
        })
      );
    }
  }

  if (docParagraphs.length === 0) {
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(No text content could be extracted)',
            italics: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docParagraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
}
