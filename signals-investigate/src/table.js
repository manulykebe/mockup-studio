const ICON_SELECTOR = 'svg[data-icon], [class*="fa-"]';

/** Converts a table cell to a readable string: checkboxes -> checked value, icons -> readable label. */
function cellToText(cell) {
  const checkbox = cell.querySelector('input[type="checkbox"]');
  if (checkbox) {
    return checkbox.checked ? 'TRUE' : 'FALSE';
  }

  const text = cell.textContent.trim();
  if (text) {
    return text;
  }

  const icons = Array.from(cell.querySelectorAll(ICON_SELECTOR));
  return icons.map(iconToLabel).filter(Boolean).join(', ');
}

/** Resolves a human-readable label for an icon: nearest aria-label, else its Font Awesome icon name. */
function iconToLabel(icon) {
  const labelled = icon.closest('[aria-label]');
  if (labelled) {
    return labelled.getAttribute('aria-label').trim();
  }

  const dataIcon = icon.getAttribute('data-icon');
  if (dataIcon) {
    return dataIcon.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return '';
}

// NOTE: this parser is intentionally generic and will be extended over time
// (e.g. more icon/value conventions) as new table shapes are encountered.
/** Parses an HTML <table> element into a plain { headers, rows } structure of strings. */
export function parseHtmlTable(table) {
  const headers = Array.from(table.querySelectorAll('thead th')).map(
    (th, i) => cellToText(th) || `Column ${i + 1}`
  );
  const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.children).map((cell) => cellToText(cell))
  );

  return { headers, rows };
}
