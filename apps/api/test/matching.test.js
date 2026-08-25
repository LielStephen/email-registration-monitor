import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { findIdentifier } from '../src/matching.js';
import { searchWorkbook } from '../src/document-pipeline/tabular.js';

test('matches a registration number as a distinct token', () => {
  assert.ok(findIdentifier('Selected: REG2026AIML00123.', 'REG2026AIML00123'));
  assert.equal(findIdentifier('XREG2026AIML00123', 'REG2026AIML00123'), null);
});

test('reports the worksheet cell and Status value for a spreadsheet match', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Registration Number', 'Status'],
    ['Liel', 'REG2026AIML00123', 'Selected'],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  const matches = searchWorkbook(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), 'REG2026AIML00123', 'selected.xlsx');
  assert.deepEqual(matches[0], {
    type: 'attachment', filename: 'selected.xlsx', location: 'Sheet Students, Row 2, Column B', locationKey: 'Students:B2', excerpt: 'REG2026AIML00123', status: 'Selected',
  });
});
