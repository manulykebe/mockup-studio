(() => {
  // src/dom.js
  function extractTocData(root) {
    const toc = root.querySelector(".binder__toc");
    if (!toc) {
      throw new Error("No .binder__toc element found on the page.");
    }
    const groups = Array.from(toc.children).filter((el) => el.querySelector(".binder__toc-page"));
    const rows = [];
    groups.forEach((group) => {
      const parentNameEl = group.querySelector(".binder__toc-page-name");
      const parentName = parentNameEl ? parentNameEl.textContent.trim() : "";
      const childNameEls = group.querySelectorAll(".binder__toc-element-name");
      if (childNameEls.length === 0) {
        rows.push([parentName, ""]);
        return;
      }
      childNameEls.forEach((childEl) => {
        rows.push([parentName, childEl.textContent.trim()]);
      });
    });
    return rows;
  }

  // src/csv.js
  var CSV_DELIMITER = ";";
  function escapeCsvField(field) {
    const value = String(field ?? "");
    if (new RegExp(`["${CSV_DELIMITER}
]`).test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  function toCsv(rows, headers) {
    const allRows = headers ? [headers, ...rows] : rows;
    return allRows.map((row) => row.map(escapeCsvField).join(CSV_DELIMITER)).join("\n");
  }

  // src/download.js
  function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function getUrlPrefix(location) {
    return location.hostname.split(".")[0] || "export";
  }

  // src/popup.js
  var TOOLBAR_TAB_BUTTON_SELECTOR = ".toolbar__tab-button.btn.btn-link.btn-sm";
  var CLOSE_POPUP_SELECTOR = '[aria-label="Close view"]';
  function openToolbarPopup(label) {
    const buttons = Array.from(document.querySelectorAll(TOOLBAR_TAB_BUTTON_SELECTOR));
    const button = label ? buttons.find((btn) => btn.textContent.trim().toLowerCase() === label.trim().toLowerCase()) : buttons[0];
    if (!button) {
      throw new Error(`No toolbar tab button found${label ? ` matching "${label}"` : ""}.`);
    }
    button.click();
    return button;
  }
  function closePopup() {
    const button = document.querySelector(CLOSE_POPUP_SELECTOR);
    if (!button) {
      throw new Error('No "Close view" button found.');
    }
    button.click();
    return button;
  }

  // src/table.js
  var ICON_SELECTOR = 'svg[data-icon], [class*="fa-"]';
  function cellToText(cell) {
    const checkbox = cell.querySelector('input[type="checkbox"]');
    if (checkbox) {
      return checkbox.checked ? "TRUE" : "FALSE";
    }
    const text = cell.textContent.trim();
    if (text) {
      return text;
    }
    const icons = Array.from(cell.querySelectorAll(ICON_SELECTOR));
    return icons.map(iconToLabel).filter(Boolean).join(", ");
  }
  function iconToLabel(icon) {
    const labelled = icon.closest("[aria-label]");
    if (labelled) {
      return labelled.getAttribute("aria-label").trim();
    }
    const dataIcon = icon.getAttribute("data-icon");
    if (dataIcon) {
      return dataIcon.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "";
  }
  function parseHtmlTable(table) {
    const headers = Array.from(table.querySelectorAll("thead th")).map(
      (th, i) => cellToText(th) || `Column ${i + 1}`
    );
    const rows = Array.from(table.querySelectorAll("tbody tr")).map(
      (tr) => Array.from(tr.children).map((cell) => cellToText(cell))
    );
    return { headers, rows };
  }

  // src/index.js
  function getToc(root = document) {
    const rows = extractTocData(root);
    const csv = toCsv(rows, ["Parent", "Child"]);
    downloadCsv(csv, `${getUrlPrefix(window.location)}.binder-toc.csv`);
    console.log(`Extracted ${rows.length} row(s).`);
    console.table(rows.map(([Parent, Child]) => ({ Parent, Child })));
    return rows;
  }
  function getTable(selector = "table", tableName) {
    const tables = Array.from(document.querySelectorAll(selector));
    const table = tables[tables.length - 1];
    if (!table) {
      throw new Error(`No element found matching selector "${selector}".`);
    }
    const { headers, rows } = parseHtmlTable(table);
    const csv = toCsv(rows, headers);
    const filenameSuffix = tableName ? `table-${tableName}` : "table";
    downloadCsv(csv, `${getUrlPrefix(window.location)}.${filenameSuffix}.csv`);
    console.log(`Extracted ${rows.length} row(s) from table.`);
    console.table(rows.map((row) => Object.fromEntries(headers.map((header, i) => [header || `Column ${i + 1}`, row[i]]))));
    return rows;
  }
  window.extract = { ...window.extract, getToc, getTable, openToolbarPopup, closePopup };
})();
