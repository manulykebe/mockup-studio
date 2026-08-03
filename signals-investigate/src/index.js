import { extractTocData, parseFieldEditForm } from './dom.js';
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
    () => (link === 'Fields' ? extractFieldsTableWithAttributes(findNewTable) : extractTable(findNewTable(), link)),
    () => closePopup(),
  ]);
  return rows;
}

// The app fully re-renders the Fields table after every "Edit field"/"Cancel" click, so rows must be
// re-queried by index each iteration instead of keeping references that go stale across the re-render.
// Monitored steps (implicit, driven by awaited waitForCondition calls): for each field row, click its
// "Edit field" button, wait for the edit form to mount, read its attributes as name/value pairs, then
// cancel back to the table before moving on to the next field.
async function extractFieldsTableWithAttributes(findNewTable) {
  const { headers: tableHeaders, rows: tableRows } = parseHtmlTable(findNewTable());
  const fieldNameIndex = tableHeaders.indexOf('Field');
  const typeIndex = tableHeaders.indexOf('Type');

  const headers = ['Field', 'Type', 'Attribute Name', 'Attribute Value'];
  const rows = [];

  for (let i = 0; i < tableRows.length; i++) {
    const fieldName = tableRows[i][fieldNameIndex] ?? '';
    const fieldType = tableRows[i][typeIndex] ?? '';

    const tr = findNewTable().querySelectorAll('tbody tr')[i];
    const editButton = tr?.querySelector('button[aria-label="Edit field"]');
    if (!editButton) {
      rows.push([fieldName, fieldType, '', '']);
      continue;
    }

    editButton.click();
    const form = await waitForCondition(() => document.querySelector('form.fieldFormAttributes'), 10000);
    const attributePairs = parseFieldEditForm(form);
    (attributePairs.length ? attributePairs : [['', '']]).forEach(([name, value]) => {
      rows.push([fieldName, fieldType, name, value]);
    });

    form.querySelector('#cancel')?.click();
    await waitForCondition(findNewTable, 10000);
  }

  const csv = toCsv(rows, headers);
  downloadCsv(csv, `${getUrlPrefix(window.location)}.table-Fields.csv`);

  console.log(`Extracted ${rows.length} row(s) from Fields table with attributes.`);
  console.table(rows.map(([Field, Type, Name, Value]) => ({ Field, Type, 'Attribute Name': Name, 'Attribute Value': Value })));

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

const BINDER_ELEMENT_FOCUSED_SELECTOR = '.binder__element.binder__element--focused';
const HIDDEN_COLUMN_ITEM_SELECTOR = '[data-testid^="dropdown-item-unhide-column-"]';

// Waits for `selector`'s match count in the whole document to stop changing across two consecutive
// checks (used for menus/lists whose content is fetched asynchronously after opening).
async function waitForStableCount(selector, timeoutMs = 5000) {
  const start = Date.now();
  let lastCount = -1;
  let stableRounds = 0;
  while (Date.now() - start < timeoutMs && stableRounds < 2) {
    const count = document.querySelectorAll(selector).length;
    stableRounds = count === lastCount ? stableRounds + 1 : 0;
    lastCount = count;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return Array.from(document.querySelectorAll(selector));
}

// Collects the aria-labels of every icon button/link in the element's header control groups.
function getBinderElementIcons(el) {
  const groups = Array.from(el.querySelectorAll('.binder__element-header-controls'));
  const icons = [];
  groups.forEach((group) => {
    Array.from(group.querySelectorAll('button[aria-label], a[aria-label]')).forEach((control) => {
      icons.push(control.getAttribute('aria-label'));
    });
  });
  return icons;
}

// Reads the currently visible column header labels of a hierarchical-table.
function getVisibleTableHeaders(table) {
  const headerRow = table.querySelector('.header[role="row"]');
  if (!headerRow) {
    return [];
  }
  return Array.from(headerRow.querySelectorAll('[role="columnheader"]'))
    .map((cell) => cell.textContent.trim())
    .filter(Boolean);
}

// Monitored chain: open a table's "Table Settings" menu (if not already open), read the columns listed
// under "Unhide Column:" (populated asynchronously), then restore the menu to its original open/closed state.
async function getHiddenTableHeaders(table) {
  const settingsButton = table.querySelector('button[aria-label="Table Settings"]');
  if (!settingsButton) {
    return [];
  }

  const wasOpen = !!document.querySelector('.dropdown-menu');
  if (!wasOpen) {
    settingsButton.click();
  }

  // Wait for the menu itself to mount before checking whether its item count has stabilized, otherwise
  // a "0 items" reading taken before the menu renders can be mistaken for "stable at 0" too early.
  const [, , headers] = await runChain([
    () => waitForCondition(() => document.querySelector('.dropdown-menu'), 5000),
    () => waitForStableCount(HIDDEN_COLUMN_ITEM_SELECTOR),
    () => Array.from(document.querySelectorAll(HIDDEN_COLUMN_ITEM_SELECTOR))
      .map((item) => item.querySelector('.grid-hidden-header div')?.textContent.trim())
      .filter(Boolean),
  ]);

  if (!wasOpen) {
    settingsButton.click();
  }

  return headers;
}

// Grabs metadata (title, header icons, and, if the element contains a hierarchical-table, its data
// source plus visible/hidden column headers) from the currently focused binder element and exports it as CSV.
async function getElementMetadata() {
  const el = document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR);
  if (!el) {
    throw new Error(`No element found matching selector "${BINDER_ELEMENT_FOCUSED_SELECTOR}".`);
  }

  const title = el.querySelector('.inline-input.primary')?.textContent.trim() ?? '';
  const icons = getBinderElementIcons(el);
  const table = el.querySelector('.hierarchical-table');
  const dataSource = table?.querySelector('.adt-external .data')?.textContent.trim();
  const visibleHeaders = table ? getVisibleTableHeaders(table) : [];
  const hiddenHeaders = table ? await getHiddenTableHeaders(table) : [];

  const headers = ['Type', 'Value'];
  const rows = [
    ...icons.map((icon) => ['Icon', icon]),
    ...(dataSource ? [['Data Source', dataSource]] : []),
    ...visibleHeaders.map((header) => ['TableHeader', header]),
    ...hiddenHeaders.map((header) => ['TableHeaderHidden', header]),
  ];

  const csv = toCsv(rows, headers);
  downloadCsv(csv, `${getUrlPrefix(window.location)}.${title || 'element'}-metadata.csv`);

  console.log(`Extracted metadata for "${title}": ${rows.length} row(s).`);
  console.table(rows.map(([Type, Value]) => ({ Type, Value })));

  return { title, rows };
}

// Expose for manual use in the console, e.g. extract.getToc(), extract.getTable(), or extract.openToolbarPopup('Fields').
window.extract = { ...window.extract, getToc, getTable, getFieldsTable, getAllTables, getHistoryRecords, getElementMetadata, openToolbarPopup, closePopup, runChain };
