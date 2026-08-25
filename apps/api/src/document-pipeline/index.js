import path from 'node:path';
import { searchPdf } from './pdf.js';
import { searchWorkbook } from './tabular.js';

export async function scanAttachment({ filename, mimeType, content }, identifier) {
  const extension = path.extname(filename || '').toLowerCase();
  if (extension === '.pdf' || mimeType === 'application/pdf') return searchPdf(content, identifier, filename);
  if (['.xlsx', '.xls', '.csv'].includes(extension) || /spreadsheet|excel|csv/.test(mimeType || '')) return searchWorkbook(content, identifier, filename);
  return [];
}
