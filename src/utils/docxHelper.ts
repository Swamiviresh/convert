import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  AlignmentType,
} from 'docx';

/**
 * Attempt to extract text from a legacy .doc file and convert it to a .docx Blob.
 * Since .doc (OLE2 binary format) cannot be fully parsed in the browser,
 * this uses a best-effort text extraction from the binary data.
 */
export async function convertDocToDocx(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Extract readable text from the binary .doc data
  const extractedText = extractTextFromDoc(bytes);

  if (!extractedText.trim()) {
    throw new Error(
      'Legacy .doc files have limited support. No readable text could be extracted. Please convert to .docx for best results.'
    );
  }

  // Split into paragraphs and generate a proper .docx
  const paragraphs = extractedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return generateDocx(paragraphs);
}

/**
 * Best-effort text extraction from a .doc binary buffer.
 * Reads printable ASCII/Latin-1 runs from the OLE2 binary,
 * filtering out control characters and short noise fragments.
 */
function extractTextFromDoc(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let currentRun = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];

    // Printable ASCII + common Latin-1 extended characters
    if (
      (byte >= 0x20 && byte <= 0x7e) ||
      byte === 0x0a ||
      byte === 0x0d ||
      byte === 0x09 ||
      (byte >= 0xc0 && byte <= 0xff)
    ) {
      currentRun += String.fromCharCode(byte);
    } else {
      if (currentRun.trim().length >= 4) {
        chunks.push(currentRun.trim());
      }
      currentRun = '';
    }
  }

  // Don't forget the last run
  if (currentRun.trim().length >= 4) {
    chunks.push(currentRun.trim());
  }

  // Join chunks, collapsing excessive whitespace
  return chunks
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
