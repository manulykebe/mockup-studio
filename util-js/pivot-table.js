/**
 * Generic, dependency-free HTML/data table pivot utility.
 * Converts flat EAV-style (Entity-Attribute-Value) row data into an Excel-like
 * pivot table: grouping rows by one or more key fields, rotating one or more
 * attribute fields into column headers, and aggregating one or more value
 * fields per cell with a configurable collision strategy.
 *
 * Usage:
 *   const { parseHtmlTable, pivotTableData, renderPivotTable } = PivotTable;
 *   const { rows } = parseHtmlTable(document.querySelector('table'));
 *   const pivot = pivotTableData(rows, {
 *       rowFields: ['Measurement Time', 'Sample Identifier'],
 *       columnFields: ['Datum Label'],
 *       values: [{ field: 'Value', aggregate: 'join' }] // 'join'|'count'|'first'|'array'|'badge'|fn
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

    /**
     * Returns the union of field names found across all rows, in first-seen order.
     * @param {Object[]} rows
     * @returns {string[]}
     */
    function getFieldNames(rows) {
        const seen = new Set();
        const fields = [];
        rows.forEach((row) => {
            Object.keys(row).forEach((key) => {
                if (!seen.has(key)) {
                    seen.add(key);
                    fields.push(key);
                }
            });
        });
        return fields;
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
     * Groups rows by rowFields and rotates columnFields values into column headers,
     * one set of columns per requested value field.
     * @param {Object[]} rows
     * @param {Object} options
     * @param {string[]} options.rowFields - fields identifying a pivoted record (Excel "Rows")
     * @param {Array<string|{field: string, order?: string[], hidden?: Iterable<string>, labels?: Object<string,string>}>} [options.columnFields] - fields whose values become column headers (Excel "Columns"); a config object can pin a custom value order, filter out hidden values, and/or rename individual values for display via `labels`
     * @param {Object<string,string>} [options.columnFields[].labels] - map of raw value -> display label used when building the column header text (grouping/order/hidden still use the raw value)
     * @param {Array<string|{field: string, aggregate?: string|Function, label?: string}>} options.values - fields to aggregate into cells (Excel "Values")
     * @param {string} [options.delimiter=', ']
     * @returns {{rowFields: string[], columns: Array<{id: string, label: string}>, data: Object[]}}
     */
    function pivotTableData(rows, options) {
        const {
            rowFields,
            columnFields = [],
            values,
            delimiter = ', '
        } = options || {};

        if (!Array.isArray(rowFields) || rowFields.length === 0) {
            throw new Error('pivotTableData requires a non-empty rowFields array');
        }
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error('pivotTableData requires a non-empty values array');
        }

        const resolvedValues = values.map((value) => (
            typeof value === 'string' ? { field: value, aggregate: 'join' } : value
        ));
        resolvedValues.forEach((value) => {
            const aggregator = typeof value.aggregate === 'function' ? value.aggregate : AGGREGATORS[value.aggregate];
            if (!aggregator) {
                throw new Error(`Unknown aggregate strategy "${value.aggregate}"`);
            }
        });
        const showValueLabel = resolvedValues.length > 1;

        const resolvedColumnFields = columnFields.map((columnField) => {
            const config = typeof columnField === 'string' ? { field: columnField } : columnField;
            return {
                field: config.field,
                order: config.order,
                hidden: config.hidden ? new Set(config.hidden) : null,
                labels: config.labels || null
            };
        });

        const groups = new Map();
        const columnGroups = [];
        const columnGroupSet = new Set();

        rows.forEach((row) => {
            const rowKeyValues = rowFields.map((field) => (row[field] != null ? row[field] : ''));
            const groupKey = rowKeyValues.join('\u0001');

            if (!groups.has(groupKey)) {
                const record = { __cells: {} };
                rowFields.forEach((field, index) => { record[field] = rowKeyValues[index]; });
                groups.set(groupKey, record);
            }
            const record = groups.get(groupKey);

            const colKeyValues = resolvedColumnFields.map((cf) => (row[cf.field] != null ? row[cf.field] : ''));
            const isHidden = resolvedColumnFields.some((cf, index) => cf.hidden && cf.hidden.has(colKeyValues[index]));
            if (isHidden) {
                return;
            }

            const colKey = colKeyValues.length ? colKeyValues.join('\u0001') : '__all__';
            // display labels are cosmetic only; grouping/order/hidden always key off the raw value
            const colLabelValues = colKeyValues.map((value, index) => {
                const labels = resolvedColumnFields[index].labels;
                return (labels && Object.prototype.hasOwnProperty.call(labels, value)) ? labels[value] : value;
            });
            const colLabel = colLabelValues.join(delimiter);

            if (!columnGroupSet.has(colKey)) {
                columnGroupSet.add(colKey);
                columnGroups.push({ key: colKey, label: colLabel, values: colKeyValues });
            }

            resolvedValues.forEach((valueDef) => {
                const cellId = `${colKey}::${valueDef.field}`;
                if (!record.__cells[cellId]) {
                    record.__cells[cellId] = [];
                }
                record.__cells[cellId].push(row[valueDef.field] != null ? row[valueDef.field] : '');
            });
        });

        // apply a custom per-field value order (e.g. from a drag-reordered value list), highest-priority field first
        if (resolvedColumnFields.some((cf) => cf.order)) {
            columnGroups.sort((a, b) => {
                for (let i = 0; i < resolvedColumnFields.length; i += 1) {
                    const order = resolvedColumnFields[i].order;
                    if (!order) continue;
                    const rankA = order.indexOf(a.values[i]);
                    const rankB = order.indexOf(b.values[i]);
                    const diff = (rankA === -1 ? order.length : rankA) - (rankB === -1 ? order.length : rankB);
                    if (diff !== 0) return diff;
                }
                return 0;
            });
        }

        const columns = [];
        columnGroups.forEach((columnGroup) => {
            resolvedValues.forEach((valueDef) => {
                const id = `${columnGroup.key}::${valueDef.field}`;
                const valueLabel = valueDef.label || valueDef.field;
                const label = showValueLabel
                    ? `${columnGroup.label ? columnGroup.label + ' – ' : ''}${valueLabel}`
                    : (columnGroup.label || valueLabel);
                columns.push({ id, label, aggregate: valueDef.aggregate });
            });
        });

        const data = Array.from(groups.values()).map((record) => {
            const out = {};
            rowFields.forEach((field) => { out[field] = record[field]; });
            columns.forEach((column) => {
                const cellValues = record.__cells[column.id] || [];
                const aggregator = typeof column.aggregate === 'function' ? column.aggregate : AGGREGATORS[column.aggregate];
                out[column.id] = cellValues.length ? aggregator(cellValues, delimiter) : '';
            });
            return out;
        });

        return { rowFields, columns, data };
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
     * @param {{rowFields: string[], columns: Array<{id: string, label: string}>, data: Object[]}} pivotResult
     * @param {Object} [options]
     * @param {string} [options.tableId]
     * @param {string} [options.tableClass]
     * @param {Object<string,string>} [options.rowFieldLabels] - map of row field name -> display label for its header cell
     * @returns {HTMLTableElement}
     */
    function renderPivotTable(container, pivotResult, options) {
        if (!container) {
            throw new Error('renderPivotTable requires a container element');
        }

        const { rowFields, columns, data } = pivotResult;
        const { tableId, tableClass = '', rowFieldLabels } = options || {};

        const headerCells = rowFields.map((field) => `<th scope="col">${escapeHtml((rowFieldLabels && rowFieldLabels[field]) || field)}</th>`)
            .concat(columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`))
            .join('');

        const bodyRows = data.map((record) => {
            const rowCells = rowFields.map((field) => `<td>${escapeHtml(record[field] != null ? record[field] : '')}</td>`)
                .concat(columns.map((column) => `<td>${escapeHtml(record[column.id] != null ? record[column.id] : '')}</td>`))
                .join('');
            return `<tr>${rowCells}</tr>`;
        }).join('');

        const idAttr = tableId ? ` id="${escapeHtml(tableId)}"` : '';
        const classAttr = tableClass ? ` class="${escapeHtml(tableClass)}"` : '';

        container.innerHTML = `<table${idAttr}${classAttr}><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        return container.querySelector('table');
    }

    return { parseHtmlTable, getFieldNames, pivotTableData, renderPivotTable, aggregators: AGGREGATORS };
}));
