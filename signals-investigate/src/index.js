import { extractTocData } from './dom.js';
import { toCsv } from './csv.js';
import { downloadCsv, getUrlPrefix } from './download.js';
import { openToolbarPopup, closePopup } from './popup.js';
import { parseHtmlTable } from './table.js';

function getToc(root = document) {
  const rows = extractTocData(root);
  const csv = toCsv(rows, ['Parent', 'Child']);
  downloadCsv(csv, `${getUrlPrefix(window.location)}.binder-toc.csv`);

  console.log(`Extracted ${rows.length} row(s).`);
  console.table(rows.map(([Parent, Child]) => ({ Parent, Child })));

  return rows;
}

// Grabs the last element matching `selector` (popups render after the main content) and exports it as CSV.
function getTable(selector = 'table', tableName) {
  const tables = Array.from(document.querySelectorAll(selector));
  const table = tables[tables.length - 1];
  if (!table) {
    throw new Error(`No element found matching selector "${selector}".`);
  }

  const { headers, rows } = parseHtmlTable(table);
  const csv = toCsv(rows, headers);
  const filenameSuffix = tableName ? `table-${tableName}` : 'table';
  downloadCsv(csv, `${getUrlPrefix(window.location)}.${filenameSuffix}.csv`);

  console.log(`Extracted ${rows.length} row(s) from table.`);
  console.table(rows.map((row) => Object.fromEntries(headers.map((header, i) => [header || `Column ${i + 1}`, row[i]]))));

  return rows;
}

// Expose for manual use in the console, e.g. extract.getToc(), extract.getTable(), or extract.openToolbarPopup('Fields').
window.extract = { ...window.extract, getToc, getTable, openToolbarPopup, closePopup };
