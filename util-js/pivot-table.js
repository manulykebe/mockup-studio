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

    // Parses a value's leading numeric portion (allowing a trailing unit suffix like "62.061 µm"); returns null when not numeric.
    function toNumber(value) {
        if (value == null) return null;
        const trimmed = String(value).trim();
        if (!trimmed || !/^-?\d+(?:\.\d+)?(?:\s*[^\d.]*)?$/.test(trimmed)) return null;
        const num = parseFloat(trimmed);
        return Number.isFinite(num) ? num : null;
    }

    // rounds to 4 decimal places to avoid floating-point noise in displayed stats
    function formatStat(num) {
        return String(Math.round(num * 10000) / 10000);
    }

    // Built-in strategies for resolving multiple values landing in the same pivot cell.
    const AGGREGATORS = {
        join: (values, delimiter) => values.join(delimiter),
        count: (values) => String(values.length),
        first: (values) => (values.length ? values[0] : ''),
        array: (values) => values.slice(),
        // a single value renders as plain text; multiple values render as an unformatted per-row table (see renderCell)
        table: (values) => (values.length > 1 ? values.slice() : (values.length ? values[0] : '')),
        badge: (values, delimiter) => {
            const unique = Array.from(new Set(values));
            return unique.length > 1 ? `${unique.join(delimiter)} (${unique.length})` : (unique[0] || '');
        },
        average: (values) => {
            const nums = values.map(toNumber).filter((n) => n !== null);
            if (!nums.length) return '';
            return formatStat(nums.reduce((sum, n) => sum + n, 0) / nums.length);
        },
        stdev: (values) => {
            const nums = values.map(toNumber).filter((n) => n !== null);
            if (nums.length < 2) return '';
            const mean = nums.reduce((sum, n) => sum + n, 0) / nums.length;
            const variance = nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (nums.length - 1);
            return formatStat(Math.sqrt(variance));
        }
    };

    /**
     * Groups rows by rowFields and rotates columnFields values into column headers.
     * When a single value field is requested, each column group gets one output column.
     * When multiple value fields are requested, each column group instead gets a single combined
     * column (`multi: true`, with a `fields` list) whose cell data is a `{label, value}[]` array,
     * meant to be rendered as a compact name/value mini-table (see renderPivotTable).
     * @param {Object[]} rows
     * @param {Object} options
     * @param {string[]} options.rowFields - fields identifying a pivoted record (Excel "Rows")
     * @param {Array<string|{field: string, order?: string[], hidden?: Iterable<string>, labels?: Object<string,string>}>} [options.columnFields] - fields whose values become column headers (Excel "Columns"); a config object can pin a custom value order, filter out hidden values, and/or rename individual values for display via `labels`
     * @param {Object<string,string>} [options.columnFields[].labels] - map of raw value -> display label used when building the column header text (grouping/order/hidden still use the raw value)
     * @param {Array<string|{field: string, aggregate?: string|Function, label?: string}>} options.values - fields to aggregate into cells (Excel "Values"); built-in aggregates are 'join'|'badge'|'count'|'first'|'array'|'table'|'average'|'stdev' ('average'/'stdev' ignore non-numeric values; 'table' renders multiple values as an unformatted per-row table, a single value as plain text)
     * @param {string} [options.delimiter=', ']
     * @returns {{rowFields: string[], columns: Array<{id: string, label: string, multi?: boolean, fields?: Array<{field: string, label: string}>}>, data: Object[]}}
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

        // when more than one value field is configured, each column group gets a single combined column
        // (rendered as a name/value mini-table) instead of one output column per value field
        const columns = [];
        columnGroups.forEach((columnGroup) => {
            if (showValueLabel) {
                columns.push({
                    id: columnGroup.key,
                    label: columnGroup.label || 'Values',
                    multi: true,
                    fields: resolvedValues.map((valueDef) => ({
                        field: valueDef.field,
                        label: valueDef.label || valueDef.field,
                        aggregate: valueDef.aggregate
                    }))
                });
            } else {
                const valueDef = resolvedValues[0];
                const valueLabel = valueDef.label || valueDef.field;
                columns.push({ id: `${columnGroup.key}::${valueDef.field}`, label: columnGroup.label || valueLabel, aggregate: valueDef.aggregate });
            }
        });

        const data = Array.from(groups.values()).map((record) => {
            const out = {};
            rowFields.forEach((field) => { out[field] = record[field]; });
            columns.forEach((column) => {
                if (column.multi) {
                    out[column.id] = column.fields.map((f) => {
                        const cellValues = record.__cells[`${column.id}::${f.field}`] || [];
                        const aggregator = typeof f.aggregate === 'function' ? f.aggregate : AGGREGATORS[f.aggregate];
                        return { label: f.label, value: cellValues.length ? aggregator(cellValues, delimiter) : '' };
                    });
                } else {
                    const cellValues = record.__cells[column.id] || [];
                    const aggregator = typeof column.aggregate === 'function' ? column.aggregate : AGGREGATORS[column.aggregate];
                    out[column.id] = cellValues.length ? aggregator(cellValues, delimiter) : '';
                }
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

    // an array cell is either {label, value} pairs (combined multi-field column, rendered as a name/value
    // mini-table) or plain raw values (the 'table' aggregate, rendered as a bare unformatted per-row table)
    function renderCell(value) {
        if (Array.isArray(value)) {
            if (!value.length) return '';
            if (typeof value[0] === 'object' && value[0] !== null) {
                const rows = value.map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th><td>${escapeHtml(entry.value)}</td></tr>`).join('');
                return `<table class="pivot-cell-table"><tbody>${rows}</tbody></table>`;
            }
            const rows = value.map((entry) => `<tr><td>${escapeHtml(entry)}</td></tr>`).join('');
            return `<table class="pivot-cell-table-raw"><tbody>${rows}</tbody></table>`;
        }
        return escapeHtml(value != null ? value : '');
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
                .concat(columns.map((column) => `<td>${renderCell(record[column.id])}</td>`))
                .join('');
            return `<tr>${rowCells}</tr>`;
        }).join('');

        const idAttr = tableId ? ` id="${escapeHtml(tableId)}"` : '';
        const classAttr = tableClass ? ` class="${escapeHtml(tableClass)}"` : '';

        container.innerHTML = `<table${idAttr}${classAttr}><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        return container.querySelector('table');
    }

    return { parseHtmlTable, getFieldNames, pivotTableData, renderPivotTable, aggregators: AGGREGATORS, toNumber };
}));
