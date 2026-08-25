import XLSX from 'xlsx';
import { findIdentifier } from '../matching.js';

function statusForRow(rows, headers, rowIndex) {
  const statusColumn = headers.findIndex((header) => String(header ?? '').trim().toLowerCase() === 'status');
  return statusColumn >= 0 ? String(rows[rowIndex]?.[statusColumn] ?? '').trim() : null;
}

export function searchWorkbook(buffer, identifier, filename) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  const matches = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headers = rows[0] || [];
    rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
      if (!findIdentifier(cell, identifier)) return;
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      matches.push({ type: 'attachment', filename, location: `Sheet ${sheetName}, Row ${rowIndex + 1}, Column ${cellRef.replace(/\d/g, '')}`, locationKey: `${sheetName}:${cellRef}`, excerpt: String(cell), status: statusForRow(rows, headers, rowIndex) });
    }));
  }
  return matches;
}
