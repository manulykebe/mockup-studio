import { extractTocData, parseFieldEditForm } from './dom.js';
import { toCsv } from './csv.js';
import { downloadCsv, getUrlPrefix } from './download.js';
import { openToolbarPopup, closePopup, waitForCondition } from './popup.js';
import { parseHtmlTable } from './table.js';
import { runChain } from './monitor.js';
import {
  runRoleAndPrivilegeExportWorkflow,
  resetRoleAndPrivilegeExportWorkflow,
  resumeRoleAndPrivilegeExportWorkflowIfPending,
} from './roleAndPrivilegeExportWorkflow.js';

function getTitleFromElement(element) {
  if (!element || !(element instanceof Element)) {
    return null;
  }

  return element.getAttribute('title') || element.title || null;
}

function getToc(root = document) {
  const rows = extractTocData(root);
  const csv = toCsv(rows, ['Parent', 'Child']);
  const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${getUrlPrefix(window.location)}#${templateTitle}#binder-toc#${timestamp}.csv`);

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
    const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
    const baseName = getUniqueBaseName(`${prefix}#${templateTitle}#${slugify(childName)}`, usedBaseNames);
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
  const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${prefix}#${templateTitle}#focused-elements#${timestamp}.csv`);

  console.log(`Exported ${manifestRows.length} focused-element image(s).`);
  console.table(manifestRows.map(([Child, JpgFile, SvgFile, Status]) => ({ Child, JpgFile, SvgFile, Status })));

  return manifestRows;
}

// Extracts a resolved <table> element's data, downloads it as CSV, and returns the rows.
function extractTable(table, tableName) {
  const { headers, rows } = parseHtmlTable(table);
  const csv = toCsv(rows, headers);
  const filenameSuffix = tableName ? `table-${tableName}` : 'table';
  const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${getUrlPrefix(window.location)}#${templateTitle}#${filenameSuffix}#${timestamp}.csv`);

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
  const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
  const timestamp = formatIsoDateTimeLocal();

  downloadCsv(csv, `${getUrlPrefix(window.location)}#${templateTitle}#table-Fields#${timestamp}.csv`);

  console.log(`Extracted ${rows.length} row(s) from Fields table with attributes.`);
  console.table(rows.map(([Field, Type, Name, Value]) => ({ Field, Type, 'Attribute Name': Name, 'Attribute Value': Value })));

  return rows;
}

const DEFAULT_POPUP_LABELS = ['Fields', 'Properties'];

// Monitored chain: runs getFieldsTable for each popup label in sequence, returning its rows keyed by label.
async function getTables_Fields_Properties(labels = DEFAULT_POPUP_LABELS) {
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
      const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
      const timestamp = formatIsoDateTimeLocal();
      downloadCsv(csv, `${getUrlPrefix(window.location)}#${templateTitle}#history#${timestamp}.csv`);

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

function normalizeActionLabel(label) {
  if (/external actions?|table actions?/i.test(label)) {
    return 'External Actions';
  }
  return label;
}

function collectMenuItemTexts(root = document) {
  const selectors = [
    '[role="menuitem"]',
    '.dropdown-item',
    '.menu-item',
    '[data-testid*="menu-item"]',
    '[data-testid*="action"]',
    '[aria-label][role="button"]',
  ];

  const texts = new Set();
  selectors.forEach((selector) => {
    Array.from(root.querySelectorAll(selector)).forEach((el) => {
      const value = (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (value) {
        texts.add(value);
      }
    });
  });

  return Array.from(texts);
}

const KNOWN_EXTERNAL_ACTION_ITEMS = {
  'GxP Sample Creation Table Actions': ['Clean Empty Rows'],
};

function parseActionNameFromIframeSrc(src) {
  if (!src) {
    return '';
  }
  const file = src.split('/').pop()?.split('?')[0] || '';
  const name = file
    .replace(/\.html?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return name;
}

async function getExternalActionItems(control) {
  const items = new Set();
  const controlLabel = control.getAttribute('aria-label')?.trim() || control.textContent.trim();
  items.add(controlLabel);

  (KNOWN_EXTERNAL_ACTION_ITEMS[controlLabel] || []).forEach((item) => items.add(item));

  const existingDialogs = new Set(Array.from(document.querySelectorAll('[role="dialog"]')));
  const existingMenus = new Set(Array.from(document.querySelectorAll('[role="menu"], .dropdown-menu, .menu, .menu-list')));

  control.click();
  await new Promise((resolve) => setTimeout(resolve, 350));

  const menuRoots = Array.from(document.querySelectorAll('[role="menu"], .dropdown-menu, .menu, .menu-list'))
    .filter((menu) => !existingMenus.has(menu));
  menuRoots.forEach((menu) => {
    collectMenuItemTexts(menu).forEach((item) => items.add(item));
  });

  const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((node) => !existingDialogs.has(node));
  if (dialog) {
    const dialogTitle = dialog.querySelector('h1, h2, h3, h4, .modal-title')?.textContent?.trim();
    if (dialogTitle) {
      items.add(dialogTitle);
    }

    collectMenuItemTexts(dialog).forEach((item) => items.add(item));

    const iframe = dialog.querySelector('iframe');
    if (iframe) {
      const inferredName = parseActionNameFromIframeSrc(iframe.getAttribute('src'));
      if (inferredName) {
        items.add(inferredName);
      }

      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          collectMenuItemTexts(iframeDoc).forEach((item) => items.add(item));
          Array.from(iframeDoc.querySelectorAll('button, a')).forEach((node) => {
            const text = node.textContent.replace(/\s+/g, ' ').trim();
            if (text) {
              items.add(text);
            }
          });
        }
      } catch {
        // Cross-origin iframe access is expected in some environments.
      }
    }

    const closeButton = dialog.querySelector('[aria-label="Close"], button[title="Close"], button.btn-close, button.close');
    closeButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return Array.from(items)
    .filter(Boolean)
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => value !== 'Close' && value !== 'I' && value !== 'Loading')
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

// Collects icon labels and expands "External Actions" controls with inspected menu/dialog item labels.
async function getBinderElementIcons(el) {
  const groups = Array.from(el.querySelectorAll('.binder__element-header-controls'));
  const icons = [];

  groups.forEach((group) => {
    Array.from(group.querySelectorAll('button[aria-label], a[aria-label]')).forEach((control) => {
      const rawLabel = control.getAttribute('aria-label')?.trim();
      if (!rawLabel) {
        return;
      }
      icons.push(rawLabel);
    });
  });

  const externalActionControls = Array.from(el.querySelectorAll('button[aria-label], a[aria-label]')).filter((control) => {
    const label = control.getAttribute('aria-label')?.trim() || '';
    return /external actions?|table actions?/i.test(label);
  });

  const externalActionItems = new Set();
  for (const control of externalActionControls) {
    const items = await getExternalActionItems(control);
    items.forEach((item) => externalActionItems.add(item));
  }

  return {
    icons,
    externalActionItems: Array.from(externalActionItems),
  };
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
async function getSectionMetadata() {
  const el = document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR);
  if (!el) {
    throw new Error(`No element found matching selector "${BINDER_ELEMENT_FOCUSED_SELECTOR}".`);
  }

  const title = el.querySelector('.inline-input.primary')?.textContent.trim() ?? '';
  const { icons, externalActionItems } = await getBinderElementIcons(el);
  const table = el.querySelector('.hierarchical-table');
  const dataSource = table?.querySelector('.adt-external .data')?.textContent.trim();
  const visibleHeaders = table ? getVisibleTableHeaders(table) : [];
  const hiddenHeaders = table ? await getHiddenTableHeaders(table) : [];

  const normalizedIcons = Array.from(new Set(icons.map(normalizeActionLabel)));
  const orderedExternalActionItems = Array.from(new Set(externalActionItems)).sort((a, b) => {
    if (a === 'Clean Empty Rows') {
      return -1;
    }
    if (b === 'Clean Empty Rows') {
      return 1;
    }
    return a.localeCompare(b);
  });

  const externalActionsValue = orderedExternalActionItems.length
    ? `External Actions (${orderedExternalActionItems.join(', ')})`
    : '';
  const iconSummary = externalActionsValue
    ? `${title} > icons: ${externalActionsValue}`
    : '';

  const headers = ['Type', 'Value'];
  const rows = [
    ...normalizedIcons.map((icon) => ['Icon', icon]),
    ...(externalActionsValue ? [['Icon', externalActionsValue]] : []),
    ...(iconSummary ? [['IconSummary', iconSummary]] : []),
    ...(dataSource ? [['Data Source', dataSource]] : []),
    ...visibleHeaders.map((header) => ['TableHeader', header]),
    ...hiddenHeaders.map((header) => ['TableHeaderHidden', header]),
  ];

  const csv = toCsv(rows, headers);
  const templateTitle = getTitleFromElement(document.getElementsByClassName('inline-input ms-1 toolbar__name text-primary')[0]) || 'TemplateUNK';
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${getUrlPrefix(window.location)}#${templateTitle}#${title}-metadata#${timestamp}.csv`);

  console.log(`Extracted metadata for "${title}": ${rows.length} row(s).`);
  console.table(rows.map(([Type, Value]) => ({ Type, Value })));

  return { title, rows };
}

function normalizeRoleName(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  const repeated = text.match(/^(.*?)(?:\s*\1)+$/);
  if (repeated && repeated[1]) {
    return repeated[1].trim();
  }

  return text;
}

function readRoleMatrixFromTable(table, tabLabel = 'Unknown Tab') {
  if (!table) {
    return [];
  }

  const headerCells = Array.from(
    table.querySelectorAll('thead th, thead td, [role="columnheader"]')
  );
  const rowHeaderCells = headerCells.length
    ? headerCells
    : Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'));

  const headers = rowHeaderCells
    .map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (!headers.length || !headers.some((header) => /role name/i.test(header))) {
    return [];
  }

  const roleNameIndex = headers.findIndex((header) => /role name/i.test(header));
  const permissionHeaders = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header, index }) => index !== roleNameIndex && !/role name|action/i.test(header));
  const rows = [];

  const dataRows = Array.from(table.querySelectorAll('tbody tr, tr'))
    .filter((tr) => {
      const text = (tr.textContent || '').replace(/\s+/g, ' ').trim();
      return !!text && !/^role name$/i.test(text) && !/action/i.test(text);
    });

  dataRows.forEach((tr, roleOrderIndex) => {
    const cells = Array.from(tr.querySelectorAll('th, td'));
    if (!cells.length) {
      return;
    }

    const roleIndex = roleOrderIndex + 1;

    const roleCell = cells[roleNameIndex] || null;
    const roleText = roleCell
      ? (
          roleCell.querySelector('.long-role-name, .role-name, [title], .truncate')?.textContent
          || roleCell.textContent
          || ''
        )
      : '';
    const roleName = normalizeRoleName(roleText);
    if (!roleName || /^role name$/i.test(roleName) || /action/i.test(roleName)) {
      return;
    }

    permissionHeaders.forEach(({ header, index }, permissionOrderIndex) => {
      const cell = cells[index] || null;
      if (!cell) {
        return;
      }

      const permissionName = header.trim();
      if (!permissionName) {
        return;
      }

      const checkbox = cell.querySelector('input[type="checkbox"]');
      const value = checkbox
        ? (checkbox.checked ? '1' : '0')
        : (cell.textContent || '').replace(/\s+/g, ' ').trim();

      const normalizedValue = checkbox
        ? (checkbox.checked ? '1' : '0')
        : /^(1|true|yes|on|enabled|allow)$/i.test(value)
          ? '1'
          : /^(0|false|no|off|disabled|deny|none|-|—|\s*)$/i.test(value)
            ? '0'
            : '1';

      rows.push([tabLabel, String(roleIndex), roleName, String(permissionOrderIndex + 1), permissionName, normalizedValue]);
    });
  });

  return rows;
}

function getTabPanelForTab(tabButton) {
  if (!tabButton) {
    return null;
  }

  const panelId = tabButton.getAttribute('aria-controls') || tabButton.getAttribute('data-bs-target') || tabButton.getAttribute('href')?.replace(/^#/, '');
  if (panelId) {
    const panelById = document.getElementById(panelId);
    if (panelById) {
      return panelById;
    }
  }

  const tablist = tabButton.closest('[role="tablist"], .nav-tabs');
  if (tablist && tablist.parentElement) {
    const siblings = Array.from(tablist.parentElement.children);
    const index = siblings.indexOf(tablist);
    if (index >= 0 && siblings[index + 1]) {
      return siblings[index + 1];
    }
  }

  return tabButton.closest('[role="tabpanel"], .tab-pane');
}

function formatIsoDateTimeLocal(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function exportRolesToCsv(options = {}) {
  const {
    includeZeroValues = true,
  } = options;

  const environment = window.location.hostname.split('.')[0] || 'unknown';

  const tabButtons = Array.from(document.querySelectorAll('.nav.nav-tabs [role="tab"], .nav-tabs .nav-link, .nav-tabs button, .nav-tabs a'))
    .filter((button) => {
      const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
      return !!text;
    });

  const roleRows = [];

  const getSubTabs = (panel) => {
    if (!panel) {
      return [];
    }

    return Array.from(panel.querySelectorAll('.nav-item button, .nav-item a, [role="tab"], .nav-link'))
      .map((button) => ({
        button,
        text: (button.textContent || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter(({ text }) => !!text && !/delete role/i.test(text));
  };

  if (tabButtons.length) {
    for (const button of tabButtons) {
      const tabLabel = (button.textContent || '').replace(/\s+/g, ' ').trim();
      const panel = getTabPanelForTab(button);
      const subTabs = getSubTabs(panel);

      const tabsToProcess = subTabs.length ? subTabs : [{ button: null, text: '' }];

      for (const { button: subTabButton, text: subTabLabel } of tabsToProcess) {
        if (subTabButton) {
          subTabButton.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        const table = panel?.querySelector('table') || document.querySelector('table');
        const rows = readRoleMatrixFromTable(table, tabLabel);
        if (rows.length) {
          const filtered = rows.filter((row) => includeZeroValues || row[row.length - 1] === '1')
            .map((row) => [environment, tabLabel, subTabLabel || '', row[1], row[2], row[3], row[4], row[5]]);
          if (filtered.length) {
            roleRows.push(...filtered);
          }
        }
      }
    }
  }

  if (!roleRows.length) {
    const tables = Array.from(document.querySelectorAll('table'));
    tables.forEach((table) => {
      const rows = readRoleMatrixFromTable(table, 'Current Tab');
      if (rows.length) {
        roleRows.push(...rows.filter((row) => includeZeroValues || row[row.length - 1] === '1').map((row) => [environment, 'Current Tab', '', row[1], row[2], row[3], row[4], row[5]]));
      }
    });
  }

  if (!roleRows.length) {
    throw new Error('No role-permission rows with value 1 found. Use extract.exportRolesToCsv({ includeZeroValues: true }) to include zero values.');
  }

  const csv = toCsv(roleRows, ['Environment', 'Tab', 'SubTab', 'Role Index', 'Role', 'Permission Index', 'Permission', 'Value']);
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${getUrlPrefix(window.location)}#user-roles#${timestamp}.csv`);

  console.log(`Extracted ${roleRows.length} role-permission row(s).`);

  return roleRows;
}

function readPrivilegeMatrixFromTable(table, objectName = 'Unknown Object') {
  if (!table) {
    return [];
  }

  const headerCells = Array.from(
    table.querySelectorAll('thead th, thead td, [role="columnheader"]')
  );
  const rowHeaderCells = headerCells.length
    ? headerCells
    : Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'));

  const headers = rowHeaderCells
    .map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (!headers.length || !headers.some((header) => /role name/i.test(header))) {
    return [];
  }

  const roleNameIndex = headers.findIndex((header) => /role name/i.test(header));
  const privilegeHeaders = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header, index }) => index !== roleNameIndex && !/role name/i.test(header));
  const rows = [];

  const dataRows = Array.from(table.querySelectorAll('tbody tr, tr'))
    .filter((tr) => {
      const text = (tr.textContent || '').replace(/\s+/g, ' ').trim();
      return !!text && !/^role name$/i.test(text);
    });

  dataRows.forEach((tr, roleOrderIndex) => {
    const cells = Array.from(tr.querySelectorAll('th, td'));
    if (!cells.length) {
      return;
    }

    const roleIndex = roleOrderIndex + 1;

    const roleCell = cells[roleNameIndex] || null;
    const roleText = roleCell
      ? (
          roleCell.querySelector('.long-role-name, .role-name, [title], .truncate')?.textContent
          || roleCell.textContent
          || ''
        )
      : '';
    const roleName = normalizeRoleName(roleText);
    if (!roleName || /^role name$/i.test(roleName)) {
      return;
    }

    privilegeHeaders.forEach(({ header, index }, privilegeOrderIndex) => {
      const cell = cells[index] || null;
      if (!cell) {
        return;
      }

      const privilegeName = header.trim();
      if (!privilegeName) {
        return;
      }

      const checkbox = cell.querySelector('input[type="checkbox"]');
      const normalizedValue = checkbox
        ? (checkbox.checked ? '1' : '0')
        : /^(1|true|yes|on|enabled|allow)$/i.test((cell.textContent || '').trim())
          ? '1'
          : '0';

      rows.push([objectName, String(roleIndex), roleName, String(privilegeOrderIndex + 1), privilegeName, normalizedValue]);
    });
  });

  return rows;
}

// Exports object privileges (from /snconfig/objects/{objectName}/privileges pages) into CSV,
// similar to exportRolesToCsv but for privilege/role matrix pages specific to individual objects.
// Reads the table, extracts role names and their privilege checkboxes, then downloads as CSV.
// Object name is extracted from role="presentation" element containing "Privileges" text.
async function exportPrivilegesToCsv(options = {}) {
  const {
    includeZeroValues = true,
  } = options;

  const environment = window.location.hostname.split('.')[0] || 'unknown';

  // Find the table first
  const table = document.querySelector('table');
  if (!table) {
    throw new Error('No privileges table found on this page.');
  }

  // Extract object name from the title element that immediately precedes the table
  let objectName = 'Unknown Object';
  
  // Search through siblings of table and its parents for a title element
  let searchElement = table;
  while (searchElement && searchElement.parentElement) {
    const parent = searchElement.parentElement;
    const siblings = Array.from(parent.children);
    const searchIndex = siblings.indexOf(searchElement);
    
    // Look at preceding siblings
    for (let i = searchIndex - 1; i >= 0; i--) {
      const sibling = siblings[i];
      const text = (sibling.innerText || sibling.textContent || '').replace(/\s+/g, ' ').trim();
      
      // Match elements with text ending in "Privileges" but not exactly "Privileges" alone
      if (text && text.endsWith('Privileges') && text !== 'Privileges' && text.length > 10) {
        objectName = text;
        break;
      }
    }
    
    if (objectName !== 'Unknown Object') break;
    searchElement = parent;
  }

  const rows = readPrivilegeMatrixFromTable(table, objectName);

  if (!rows.length) {
    throw new Error('No privilege rows found. Use extract.exportPrivilegesToCsv({ includeZeroValues: true }) to include zero values.');
  }

  const filtered = rows.filter((row) => includeZeroValues || row[row.length - 1] === '1')
    .map((row) => [environment, objectName, row[1], row[2], row[3], row[4], row[5]]);

  if (!filtered.length) {
    throw new Error('No privilege rows with value 1 found. Use extract.exportPrivilegesToCsv({ includeZeroValues: true }) to include zero values.');
  }

  const csv = toCsv(filtered, ['Environment', 'Object', 'Role Index', 'Role', 'Privilege Index', 'Privilege', 'Value']);
  const timestamp = formatIsoDateTimeLocal();
  const filename = `${getUrlPrefix(window.location)}#${objectName}-privileges#${timestamp}.csv`;
  downloadCsv(csv, filename);

  console.log(`Extracted ${filtered.length} privilege row(s) for ${objectName}.`);

  return filtered;
}


const SYSTEM_OBJECTS_SERVER = 'https://devinternal.srppvt4s3r.revvitycloud.eu/';
const SYSTEM_OBJECTS_PATH = 'snconfig/objects';
const SYSTEM_OBJECT_NAME_SELECTOR = 'h4.entity-info-name span[title]';

// Extracts the System Objects list (Configuration > System Objects, `${server}snconfig/objects`) into
// CSV, reading each object's name from its `<span title>`. Navigates to the page first (and asks you to
// re-run) if the browser isn't already there, since a full navigation would tear down this script.
function listSystemObjects(server = SYSTEM_OBJECTS_SERVER) {
  const targetUrl = `${server}${SYSTEM_OBJECTS_PATH}`;
  if (!window.location.href.startsWith(targetUrl)) {
    console.log(`Navigating to ${targetUrl} — run extract.listSystemObjects() again once the page has loaded.`);
    window.location.href = targetUrl;
    return null;
  }

  const nameEls = Array.from(document.querySelectorAll(SYSTEM_OBJECT_NAME_SELECTOR));
  const names = Array.from(new Set(nameEls.map((el) => el.getAttribute('title')?.trim()).filter(Boolean)));
  const rows = names.map((name) => [name]);

  const csv = toCsv(rows, ['System Object']);
  const timestamp = formatIsoDateTimeLocal();
  downloadCsv(csv, `${getUrlPrefix(window.location)}#SystemObjects#${timestamp}.csv`);

  console.log(`Extracted ${rows.length} system object(s).`);
  console.table(rows.map(([Name]) => ({ Name })));

  return names;
}

// Expose for manual use in the console, e.g. extract.getToc(), extract.getTable(), or extract.openToolbarPopup('Fields').
window.extract = {
  ...window.extract,
  getToc,
  // getTable,
  getFieldsTable,
  getTables_Fields_Properties,
  getHistoryRecords,
  getSectionMetadata,
  exportFocusedElementImagesFromToc,
  exportRolesToCsv,
  exportPrivilegesToCsv,
  listSystemObjects,
  openToolbarPopup,
  closePopup,
  runChain,
  runRoleAndPrivilegeExportWorkflow,
  resetRoleAndPrivilegeExportWorkflow,
};

// Resume a role/privilege export workflow left in progress by the previous page load, now that
// window.extract is fully assigned.
resumeRoleAndPrivilegeExportWorkflowIfPending();
