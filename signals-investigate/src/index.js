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

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function cloneWithInlineStyles(node) {
  const clone = node.cloneNode(true);
  const sourceWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  const cloneWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);

  while (sourceWalker.nextNode() && cloneWalker.nextNode()) {
    const sourceEl = sourceWalker.currentNode;
    const cloneEl = cloneWalker.currentNode;
    const computed = getComputedStyle(sourceEl);
    const styleText = Array.from(computed)
      .map((prop) => `${prop}:${computed.getPropertyValue(prop)};`)
      .join('');
    cloneEl.setAttribute('style', styleText);
  }

  // Render snapshots without the selected/focused outline treatment.
  clone.classList.remove('binder__element--focused');
  const rootStyle = clone.getAttribute('style') || '';
  clone.setAttribute('style', `${rootStyle};outline:none !important;border:none !important;box-shadow:none !important;background:#ffffff !important;`);

  Array.from(clone.querySelectorAll('*')).forEach((el) => {
    const style = el.getAttribute('style') || '';
    el.setAttribute('style', `${style};outline:none !important;box-shadow:none !important;`);
  });

  return clone;
}

async function focusedElementToJpgBlob(element, scale = 2, quality = 0.92) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = cloneWithInlineStyles(element);
  const serialized = new XMLSerializer().serializeToString(clone);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
  <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
</svg>`;

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to render focused element to image.'));
      img.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Failed to encode focused element image as JPG.'));
      }, 'image/jpeg', quality);
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function focusedElementToSvgBlob(element) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = cloneWithInlineStyles(element);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
  <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
</svg>`;

  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

async function focusedElementToImageAssets(element, scale = 2) {
  const svgBlob = focusedElementToSvgBlob(element);
  const assets = [{ blob: svgBlob, extension: 'svg' }];

  try {
    const jpgBlob = await focusedElementToJpgBlob(element, scale);
    assets.unshift({ blob: jpgBlob, extension: 'jpg' });
  } catch (error) {
    // Keep SVG export as a reliable fallback when JPG encoding is blocked.
  }

  return assets;
}

function getUniqueBaseName(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  let n = 2;
  while (usedNames.has(`${baseName}-${n}`)) {
    n += 1;
  }

  const unique = `${baseName}-${n}`;
  usedNames.add(unique);
  return unique;
}

// Iterates TOC child sections (from getToc-style rows), focuses each section, and downloads a JPG snapshot
// of the currently focused binder element for that section.
async function exportFocusedElementImagesFromToc(options = {}) {
  const {
    maxChildren,
    settleMs = 400,
    imageScale = 2,
    timeoutMs = 10000,
  } = options;

  const tocRows = extractTocData(document);
  const childNames = Array.from(new Set(tocRows.map(([, child]) => child).filter(Boolean)));
  const selectedChildren = Number.isInteger(maxChildren) && maxChildren > 0
    ? childNames.slice(0, maxChildren)
    : childNames;

  if (selectedChildren.length === 0) {
    throw new Error('No TOC child sections found.');
  }

  const prefix = getUrlPrefix(window.location);
  const usedBaseNames = new Set();
  const manifestRows = [];

  for (let i = 0; i < selectedChildren.length; i++) {
    const childName = selectedChildren[i];
    const childEl = Array.from(document.querySelectorAll('.binder__toc-element-name'))
      .find((el) => el.textContent.trim() === childName);
    if (!childEl) {
      manifestRows.push([childName, '', 'NOT_FOUND']);
      continue;
    }

    const clickTarget = childEl.closest('.binder__toc-element, [role="button"], button, a') || childEl;
    clickTarget.click();

    await waitForCondition(() => document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR), timeoutMs);
    await new Promise((resolve) => setTimeout(resolve, settleMs));

    const focused = document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR);
    if (!focused) {
      manifestRows.push([childName, '', '', 'NO_FOCUSED_ELEMENT']);
      continue;
    }

    const baseName = getUniqueBaseName(`${prefix}.${slugify(childName)}`, usedBaseNames);
    const imageAssets = await focusedElementToImageAssets(focused, imageScale);
    const jpgFilename = imageAssets.find((asset) => asset.extension === 'jpg')
      ? `${baseName}.jpg`
      : '';
    const svgFilename = `${baseName}.svg`;

    imageAssets.forEach((asset) => {
      const filename = `${baseName}.${asset.extension}`;
      downloadBlob(asset.blob, filename);
    });

    manifestRows.push([childName, jpgFilename, svgFilename, 'OK']);
  }

  const csv = toCsv(manifestRows, ['Child', 'JPG File', 'SVG File', 'Status']);
  downloadCsv(csv, `${prefix}.focused-elements.csv`);

  console.log(`Exported ${manifestRows.length} focused-element image(s).`);
  console.table(manifestRows.map(([Child, JpgFile, SvgFile, Status]) => ({ Child, JpgFile, SvgFile, Status })));

  return manifestRows;
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
window.extract = {
  ...window.extract,
  getToc,
  getTable,
  getFieldsTable,
  getAllTables,
  getHistoryRecords,
  getElementMetadata,
  exportFocusedElementImagesFromToc,
  openToolbarPopup,
  closePopup,
  runChain,
};
