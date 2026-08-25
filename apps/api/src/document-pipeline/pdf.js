import pdf from 'pdf-parse';
import { findIdentifier } from '../matching.js';

async function ocrText(buffer) {
  if (process.env.ENABLE_OCR !== 'true' || !process.env.OCR_ENDPOINT) return '';
  const response = await fetch(process.env.OCR_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buffer });
  if (!response.ok) throw new Error(`OCR request failed with ${response.status}`);
  const payload = await response.json();
  return String(payload.text || '');
}

export async function searchPdf(buffer, identifier, filename) {
  const parsed = await pdf(buffer);
  if (findIdentifier(parsed.text, identifier)) return [{ type: 'attachment', filename, location: 'PDF text layer', locationKey: 'pdf:text', excerpt: parsed.text.slice(0, 300), status: null }];
  const scannedText = await ocrText(buffer);
  if (!findIdentifier(scannedText, identifier)) return [];
  return [{ type: 'attachment', filename, location: 'PDF OCR result', locationKey: 'pdf:ocr', excerpt: scannedText.slice(0, 300), status: null }];
}
