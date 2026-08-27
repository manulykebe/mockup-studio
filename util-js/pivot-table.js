/**
 * Generic, dependency-free HTML/data table pivot utility.
 * Converts flat EAV-style (Entity-Attribute-Value) row data into an Excel-like
 * pivot table: grouping rows by key fields and rotating an attribute field
 * into dynamic columns, with configurable handling of multi-value collisions.
 *
 * Usage:
 *   const { parseHtmlTable, pivotTableData, renderPivotTable } = PivotTable;
 *   const { headers, rows } = parseHtmlTable(document.querySelector('table'));
 *   const pivot = pivotTableData(rows, {
 *       rowKeys: ['Measurement Time', 'Sample Identifier'],
 *       pivotCol: 'Datum Label',
 *       valueFn: (row) => row['Scalar Double Datum'] || row['Scalar String Datum'],
 *       aggregate: 'join' // 'join' | 'count' | 'first' | 'array' | 'badge' | custom fn
 *   });
 *   renderPivotTable(document.getElementById('out'), pivot);
 */
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.PivotTable = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Extracts headers and row objects from an HTML <table> element.
     * @param {HTMLTableElement} tableEl
     * @returns {{headers: string[], rows: Object[]}}
     */
    function parseHtmlTable(tableEl) {
        if (!tableEl) {
            throw new Error('parseHtmlTable requires a table element');
        }

        const headerRow = tableEl.querySelector('thead tr');
        const headerCells = headerRow ? Array.from(headerRow.children) : [];
        const headers = headerCells.map((cell) => cell.textContent.trim());

        const bodyRows = Array.from(tableEl.querySelectorAll('tbody tr'));
        const rows = bodyRows.map((tr) => {
            const cells = Array.from(tr.children);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = (cells[index] ? cells[index].textContent : '').trim();
            });
            return row;
        });

        return { headers, rows };
    }

    // Built-in strategies for resolving multiple values landing in the same pivot cell.
    const AGGREGATORS = {
        join: (values, delimiter) => values.join(delimiter),
        count: (values) => String(values.length),
        first: (values) => (values.length ? values[0] : ''),
        array: (values) => values.slice(),
        badge: (values, delimiter) => {
            const unique = Array.from(new Set(values));
            return unique.length > 1 ? `${unique.join(delimiter)} (${unique.length})` : (unique[0] || '');
        }
    };

    /**
     * Groups rows by rowKeys and rotates pivotCol values into columns.
     * @param {Object[]} rows
     * @param {Object} options
     * @param {string[]} options.rowKeys - fields identifying a pivoted record
     * @param {string} options.pivotCol - field whose values become column headers
     * @param {(row: Object) => string} [options.valueFn] - extracts the cell value from a source row
     * @param {string|(values: string[], delimiter: string) => *} [options.aggregate='join'] - collision strategy
     * @param {string} [options.delimiter=', ']
     * @returns {{rowKeys: string[], columns: string[], data: Object[]}}
     */
    function pivotTableData(rows, options) {
        const {
            rowKeys,
            pivotCol,
            valueFn = (row) => row.value,
            aggregate = 'join',
            delimiter = ', '
        } = options || {};

        if (!Array.isArray(rowKeys) || rowKeys.length === 0) {
            throw new Error('pivotTableData requires a non-empty rowKeys array');
        }
        if (!pivotCol) {
            throw new Error('pivotTableData requires a pivotCol');
        }

        const aggregator = typeof aggregate === 'function' ? aggregate : AGGREGATORS[aggregate];
        if (!aggregator) {
            throw new Error(`Unknown aggregate strategy "${aggregate}"`);
        }

        const groups = new Map();
        const columns = [];
        const columnSet = new Set();

        rows.forEach((row) => {
            const keyValues = rowKeys.map((key) => (row[key] != null ? row[key] : ''));
            const groupKey = keyValues.join('\u0001');
            const column = row[pivotCol] != null ? row[pivotCol] : '';

            if (!columnSet.has(column)) {
                columnSet.add(column);
                columns.push(column);
            }

            if (!groups.has(groupKey)) {
                const record = { __cells: {} };
                rowKeys.forEach((key, index) => { record[key] = keyValues[index]; });
                groups.set(groupKey, record);
            }

            const record = groups.get(groupKey);
            if (!record.__cells[column]) {
                record.__cells[column] = [];
            }
            record.__cells[column].push(valueFn(row));
        });

        const data = Array.from(groups.values()).map((record) => {
            const out = {};
            rowKeys.forEach((key) => { out[key] = record[key]; });
            columns.forEach((column) => {
                const values = record.__cells[column] || [];
                out[column] = values.length ? aggregator(values, delimiter) : '';
            });
            return out;
        });

        return { rowKeys, columns, data };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Renders a pivotTableData() result as an HTML <table> inside container.
     * @param {HTMLElement} container
     * @param {{rowKeys: string[], columns: string[], data: Object[]}} pivotResult
     * @param {Object} [options]
     * @param {string} [options.tableId]
     * @param {string} [options.tableClass]
     * @returns {HTMLTableElement}
     */
    function renderPivotTable(container, pivotResult, options) {
        if (!container) {
            throw new Error('renderPivotTable requires a container element');
        }

        const { rowKeys, columns, data } = pivotResult;
        const { tableId, tableClass = '' } = options || {};
        const allFields = rowKeys.concat(columns);

        const headerCells = allFields
            .map((label) => `<th scope="col">${escapeHtml(label)}</th>`)
            .join('');

        const bodyRows = data.map((record) => {
            const cells = allFields
                .map((key) => `<td>${escapeHtml(record[key] != null ? record[key] : '')}</td>`)
                .join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const idAttr = tableId ? ` id="${escapeHtml(tableId)}"` : '';
        const classAttr = tableClass ? ` class="${escapeHtml(tableClass)}"` : '';

        container.innerHTML = `<table${idAttr}${classAttr}><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        return container.querySelector('table');
    }

    return { parseHtmlTable, pivotTableData, renderPivotTable, aggregators: AGGREGATORS };
}));
