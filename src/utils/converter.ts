import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import heic2any from 'heic2any';
import { generateDocx } from './docxHelper';

const MAX_FILE_SIZE_MB = 50;
const DOCX_MAX_SIZE_MB = 25;

export function validateFileSize(file: File): string | null {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return `File size (${sizeMB.toFixed(1)} MB) exceeds the ${MAX_FILE_SIZE_MB} MB limit.`;
  }

  const ext = getFileExtension(file.name);
  if ((ext === 'docx' || ext === 'pdf') && sizeMB > DOCX_MAX_SIZE_MB) {
    return `Document files larger than ${DOCX_MAX_SIZE_MB} MB may cause performance issues. Please use a smaller file.`;
  }

  return null;
}

export type ConversionType = 'docx-to-pdf' | 'pdf-to-docx' | 'jpg-to-heic' | 'heic-to-jpg';

export interface ConversionResult {
  blob: Blob;
  fileName: string;
}

function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function getFileBaseName(name: string): string {
  const parts = name.split('.');
  if (parts.length > 1) parts.pop();
  return parts.join('.');
}

export function getAvailableConversions(file: File): ConversionType[] {
  const ext = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  switch (ext) {
    case 'docx':
      return ['docx-to-pdf'];
    case 'pdf':
      return ['pdf-to-docx'];
    case 'jpg':
    case 'jpeg':
      return ['jpg-to-heic'];
    case 'heic':
    case 'heif':
      return ['heic-to-jpg'];
    default:
      break;
  }

  // Fallback: detect by MIME type if extension is ambiguous
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return ['docx-to-pdf'];
  }
  if (mimeType === 'application/pdf') {
    return ['pdf-to-docx'];
  }
  if (mimeType === 'image/jpeg') {
    return ['jpg-to-heic'];
  }
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return ['heic-to-jpg'];
  }

  return [];
}

export function getConversionLabel(type: ConversionType): string {
  switch (type) {
    case 'docx-to-pdf':
      return 'DOCX → PDF';
    case 'pdf-to-docx':
      return 'PDF → DOCX';
    case 'jpg-to-heic':
      return 'JPG → HEIC';
    case 'heic-to-jpg':
      return 'HEIC → JPG';
  }
}

export function getAcceptedFileTypes(): string {
  return '.docx,.pdf,.jpg,.jpeg,.heic,.heif,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
}

async function docxToPdf(file: File): Promise<ConversionResult> {
  let html: string;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = result.value;

    if (result.messages.length > 0) {
      console.warn('Mammoth conversion warnings:', result.messages);
    }
  } catch (err) {
    throw new Error(
      `Failed to read the DOCX file. It may be corrupted or password-protected. ${err instanceof Error ? err.message : ''}`
    );
  }

  if (!html || !html.trim()) {
    throw new Error('The DOCX file appears to be empty or contains no readable content.');
  }

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 7;

    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');
    const elements = parsed.body.children;

    let y = margin;

    const addNewPageIfNeeded = () => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const renderTextBlock = (text: string, fontSize: number, bold: boolean) => {
      doc.setFontSize(fontSize);
      if (bold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        addNewPageIfNeeded();
        doc.text(line, margin, y);
        y += lineHeight * (fontSize / 12);
      }
      y += 2;
    };

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';
      if (!text) continue;

      if (tag === 'h1') {
        renderTextBlock(text, 22, true);
      } else if (tag === 'h2') {
        renderTextBlock(text, 18, true);
      } else if (tag === 'h3') {
        renderTextBlock(text, 15, true);
      } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
        renderTextBlock(text, 13, true);
      } else if (tag === 'ul' || tag === 'ol') {
        const items = el.querySelectorAll('li');
        items.forEach((li, idx) => {
          const prefix = tag === 'ol' ? `${idx + 1}. ` : '• ';
          renderTextBlock(prefix + (li.textContent?.trim() || ''), 12, false);
        });
      } else if (tag === 'table') {
        const rows = el.querySelectorAll('tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, th');
          const rowText = Array.from(cells)
            .map((cell) => cell.textContent?.trim() || '')
            .join('  |  ');
          if (rowText.trim()) {
            renderTextBlock(rowText, 11, row.querySelector('th') !== null);
          }
        });
        y += 3;
      } else {
        renderTextBlock(text, 12, false);
      }
    }

    if (elements.length === 0 && html.trim()) {
      const plainText = parsed.body.textContent || '';
      renderTextBlock(plainText, 12, false);
    }

    const blob = doc.output('blob');
    return {
      blob,
      fileName: getFileBaseName(file.name) + '.pdf',
    };
  } catch (err) {
    throw new Error(
      `Failed to generate PDF from the DOCX content. ${err instanceof Error ? err.message : ''}`
    );
  }
}

async function pdfToDocx(file: File): Promise<ConversionResult> {
  let arrayBuffer: ArrayBuffer;

  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    throw new Error('Failed to read the PDF file. It may be corrupted.');
  }

  const pdfjsLib = await loadPdfJs();

  let pdf: PdfDocument;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    throw new Error(
      `Failed to parse the PDF file. It may be corrupted or password-protected. ${err instanceof Error ? err.message : ''}`
    );
  }

  if (pdf.numPages === 0) {
    throw new Error('The PDF file has no pages.');
  }

  const paragraphs: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText) {
        const pageParagraphs = pageText.split(/\s{2,}/).filter((p) => p.trim());
        paragraphs.push(...pageParagraphs);
      }

      if (i < pdf.numPages) {
        paragraphs.push('');
      }
    } catch (err) {
      console.warn(`Warning: Could not extract text from page ${i}:`, err);
    }
  }

  try {
    const blob = await generateDocx(paragraphs);
    return {
      blob,
      fileName: getFileBaseName(file.name) + '.docx',
    };
  } catch (err) {
    throw new Error(
      `Failed to generate DOCX file. ${err instanceof Error ? err.message : ''}`
    );
  }
}

interface PdfJsLib {
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
}

interface PdfDocument {
  numPages: number;
  getPage(num: number): Promise<PdfPage>;
}

interface PdfPage {
  getTextContent(): Promise<PdfTextContent>;
}

interface PdfTextContent {
  items: Array<{ str?: string }>;
}

async function loadPdfJs(): Promise<PdfJsLib> {
  const win = window as unknown as Record<string, unknown>;
  if (win['pdfjsLib']) {
    return win['pdfjsLib'] as PdfJsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const lib = (window as unknown as Record<string, unknown>)['pdfjsLib'] as PdfJsLib;
      if (lib && typeof lib === 'object' && 'GlobalWorkerOptions' in lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      resolve(lib);
    };
    script.onerror = () =>
      reject(new Error('Failed to load PDF processing library. Please check your internet connection and try again.'));
    document.head.appendChild(script);
  });
}

async function jpgToHeic(file: File): Promise<ConversionResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert image'));
      },
      'image/webp',
      0.95
    );
  });

  return {
    blob,
    fileName: getFileBaseName(file.name) + '.webp',
  };
}

async function heicToJpg(file: File): Promise<ConversionResult> {
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });

  const resultBlob = Array.isArray(blob) ? blob[0] : blob;

  return {
    blob: resultBlob,
    fileName: getFileBaseName(file.name) + '.jpg',
  };
}

export async function convertFile(
  file: File,
  conversionType: ConversionType
): Promise<ConversionResult> {
  switch (conversionType) {
    case 'docx-to-pdf':
      return docxToPdf(file);
    case 'pdf-to-docx':
      return pdfToDocx(file);
    case 'jpg-to-heic':
      return jpgToHeic(file);
    case 'heic-to-jpg':
      return heicToJpg(file);
    default:
      throw new Error('Unsupported conversion type');
  }
}
