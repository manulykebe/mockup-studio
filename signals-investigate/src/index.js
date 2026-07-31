import { extractTocData } from './dom.js';
import { toCsv } from './csv.js';
import { downloadCsv, getUrlPrefix } from './download.js';
import { openToolbarPopup, closePopup, waitForCondition } from './popup.js';
import { parseHtmlTable } from './table.js';
import { runChain } from './monitor.js';

function getToc(root = document) {
  const rows = extractTocData(root);
  const csv = toCsv(rows, ['Parent', 'Child']);
  downloadCsv(csv, `${getUrlPrefix(window.location)}.binder-toc.csv`);

  console.log(`Extracted ${rows.length} row(s).`);
  console.table(rows.map(([Parent, Child]) => ({ Parent, Child })));

  return rows;
}

// Extracts a resolved <table> element's data, downloads it as CSV, and returns the rows.
function extractTable(table, tableName) {
  const { headers, rows } = parseHtmlTable(table);
  const csv = toCsv(rows, headers);
  const filenameSuffix = tableName ? `table-${tableName}` : 'table';
  downloadCsv(csv, `${getUrlPrefix(window.location)}.${filenameSuffix}.csv`);

  console.log(`Extracted ${rows.length} row(s) from table.`);
  console.table(rows.map((row) => Object.fromEntries(headers.map((header, i) => [header || `Column ${i + 1}`, row[i]]))));

  return rows;
}

// Grabs the last element matching `selector` (popups render after the main content) and exports it as CSV.
function getTable(selector = 'table', tableName) {
  const tables = Array.from(document.querySelectorAll(selector));
  const table = tables[tables.length - 1];
  if (!table) {
    throw new Error(`No element found matching selector "${selector}".`);
  }

  return extractTable(table, tableName);
}

// Monitored chain: open the Fields popup, wait for its table to actually render, grab it, then close the popup.
// The table is identified by diffing against tables that existed before the popup opened, since DOM order
// alone isn't a reliable way to tell the popup's table apart from tables already on the page.
async function getFieldsTable(link) {
  const existingTables = new Set(document.querySelectorAll('table'));
  const findNewTable = () => Array.from(document.querySelectorAll('table')).find((table) => !existingTables.has(table));

  const [, , rows] = await runChain([
    () => openToolbarPopup(link),
    () => waitForCondition(findNewTable, 10000),
    () => extractTable(findNewTable(), link),
    () => closePopup(),
  ]);
  return rows;
}

const DEFAULT_POPUP_LABELS = ['Fields', 'Properties'];

// Monitored chain: runs getFieldsTable for each popup label in sequence, returning its rows keyed by label.
async function getAllTables(labels = DEFAULT_POPUP_LABELS) {
  const results = await runChain(labels.map((label) => () => getFieldsTable(label)));
  return Object.fromEntries(labels.map((label, i) => [label, results[i]]));
}

const HISTORY_LIST_SELECTOR = '.history-list';
const HISTORY_ROW_SELECTOR = '.record-browser-row';

// Scrolls `container` to the bottom repeatedly until `rowSelector` stops matching new rows (the History
// panel lazy-loads its list on scroll instead of rendering all rows up front). Requires the row count to
// stay unchanged twice in a row before stopping, since each batch can take a moment to fetch and render.
async function loadAllRows(container, rowSelector, timeoutMs = 15000) {
  const start = Date.now();
  let lastCount = -1;
  let stableRounds = 0;
  while (Date.now() - start < timeoutMs && stableRounds < 2) {
    const count = container.querySelectorAll(rowSelector).length;
    stableRounds = count === lastCount ? stableRounds + 1 : 0;
    lastCount = count;
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return Array.from(container.querySelectorAll(rowSelector));
}

function parseHistoryRow(row) {
  const name = row.querySelector('.user-info-name')?.textContent.trim() ?? '';
  const email = row.querySelector('.history-cell.name .smaller')?.textContent.trim() ?? '';
  const description = row.querySelector('.history-cell.description')?.textContent.trim() ?? '';
  const date = row.querySelector('.history-cell.date')?.textContent.trim() ?? '';
  return [name, email, description, date];
}

// Monitored chain: open the History popup, scroll its (non-table) record list to load every entry, then
// extract each row's user/description/date into CSV before closing the popup again.
async function getHistoryRecords() {
  const headers = ['Name', 'Email', 'Description', 'Date'];

  const [, , rows] = await runChain([
    () => openToolbarPopup('History'),
    () => waitForCondition(() => document.querySelector(`${HISTORY_LIST_SELECTOR} ${HISTORY_ROW_SELECTOR}`), 10000),
    async () => {
      const container = document.querySelector(HISTORY_LIST_SELECTOR);
      const rowEls = await loadAllRows(container, HISTORY_ROW_SELECTOR);
      const data = rowEls.map(parseHistoryRow);
      const csv = toCsv(data, headers);
      downloadCsv(csv, `${getUrlPrefix(window.location)}.history.csv`);

      console.log(`Extracted ${data.length} row(s) from history.`);
      console.table(data.map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]]))));

      return data;
    },
    () => closePopup(),
  ]);
  return rows;
}

// Expose for manual use in the console, e.g. extract.getToc(), extract.getTable(), or extract.openToolbarPopup('Fields').
window.extract = { ...window.extract, getToc, getTable, getFieldsTable, getAllTables, getHistoryRecords, openToolbarPopup, closePopup, runChain };
