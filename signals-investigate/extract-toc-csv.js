/**
 * Extracts parent/child names from a `.binder__toc` tree and downloads them as a single CSV.
 * Run this in the browser console (or as a <script> on the page) while the TOC is rendered.
 */
(function () {
  const CSV_HEADER = ['Parent', 'Child'];

  function extractTocData(root) {
    const toc = root.querySelector('.binder__toc');
    if (!toc) {
      throw new Error('No .binder__toc element found on the page.');
    }

    // Each direct child of .binder__toc that owns a .binder__toc-page is one "parent" group;
    // its .binder__toc-element children are nested inside the same group div.
    const groups = Array.from(toc.children).filter((el) => el.querySelector('.binder__toc-page'));

    const rows = [];
    groups.forEach((group) => {
      const parentNameEl = group.querySelector('.binder__toc-page-name');
      const parentName = parentNameEl ? parentNameEl.textContent.trim() : '';

      const childNameEls = group.querySelectorAll('.binder__toc-element-name');
      if (childNameEls.length === 0) {
        rows.push([parentName, '']);
        return;
      }

      childNameEls.forEach((childEl) => {
        rows.push([parentName, childEl.textContent.trim()]);
      });
    });

    return rows;
  }

  const CSV_DELIMITER = ';';

  function escapeCsvField(field) {
    const value = String(field ?? '');
    if (new RegExp(`["${CSV_DELIMITER}\n]`).test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function toCsv(rows) {
    return [CSV_HEADER, ...rows]
      .map((row) => row.map(escapeCsvField).join(CSV_DELIMITER))
      .join('\n');
  }

  function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Prefix the file name with the first label of the hostname, e.g. "jnj-test" from "jnj-test.srpstgkj7h.revvitycloud.eu".
  function getUrlPrefix(location) {
    return location.hostname.split('.')[0] || 'export';
  }

  const rows = extractTocData(document);
  const csv = toCsv(rows);
  downloadCsv(csv, `${getUrlPrefix(window.location)}.binder-toc.csv`);

  console.log(`Extracted ${rows.length} row(s).`);
  console.table(rows.map(([Parent, Child]) => ({ Parent, Child })));
})();
