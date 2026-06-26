console.log("grab_table.js loaded - v2.0.0");
function grabTable(tableElement) {
	if (!tableElement || tableElement.tagName !== "TABLE") {
		throw new TypeError("grabTable expects an HTMLTableElement");
	}

	var headerRows = getHeaderRows(tableElement);
	var captions = buildCaptions(headerRows);
	var dataRows = getDataRows(tableElement, headerRows);

	var rows = dataRows.map(function (row, rowIndex) {
		var extracted = extractRow(row, captions);
		extracted.index = rowIndex;
		return extracted;
	});

	return {
		captions: captions,
		rows: rows,
		meta: {
			headerRowCount: headerRows.length,
			dataRowCount: rows.length,
			columnCount: captions.length || inferColumnCount(dataRows)
		}
	};
}

function grabAllTables(rootElement) {
	var scope = rootElement || (typeof document !== "undefined" ? document : null);
	if (!scope || typeof scope.querySelectorAll !== "function") {
		return [];
	}

	var tables = Array.from(scope.querySelectorAll("table"));

	return tables.map(function (table, tableIndex) {
		return {
			tableIndex: tableIndex,
			tableId: table.id || "",
			tableClass: normalizeText(table.className || ""),
			result: grabTable(table)
		};
	});
}

function grabTableResultToCsv(grabResult, options) {
	if (!grabResult || typeof grabResult !== "object") {
		throw new TypeError("grabTableResultToCsv expects output from grabTable");
	}

	var csvOptions = options || {};
	var delimiter = typeof csvOptions.delimiter === "string" ? csvOptions.delimiter : ",";
	var lineBreak = typeof csvOptions.lineBreak === "string" ? csvOptions.lineBreak : "\r\n";
	var includeHeader = csvOptions.includeHeader !== false;

	var rows = Array.isArray(grabResult.rows) ? grabResult.rows : [];
	var captions = Array.isArray(grabResult.captions) ? grabResult.captions.slice() : [];

	var columnCount = captions.length;
	rows.forEach(function (row) {
		var rowLength = row && Array.isArray(row.cells) ? row.cells.length : 0;
		columnCount = Math.max(columnCount, rowLength);
	});

	if (!columnCount) {
		return "";
	}

	for (var i = captions.length; i < columnCount; i += 1) {
		captions.push("column_" + (i + 1));
	}

	var lines = [];

	if (includeHeader) {
		lines.push(captions.map(function (caption) {
			return escapeCsvField(caption, delimiter);
		}).join(delimiter));
	}

	rows.forEach(function (row) {
		var cells = row && Array.isArray(row.cells) ? row.cells : [];
		var line = [];
		for (var c = 0; c < columnCount; c += 1) {
			line.push(escapeCsvField(stringifyCellForCsv(cells[c]), delimiter));
		}
		lines.push(line.join(delimiter));
	});

	return lines.join(lineBreak);
}

function getHeaderRows(tableElement) {
	if (tableElement.tHead && tableElement.tHead.rows.length) {
		return Array.from(tableElement.tHead.rows);
	}

	return Array.from(tableElement.rows).filter(function (row) {
		return row.querySelector("th") !== null;
	});
}

function buildCaptions(headerRows) {
	if (!headerRows.length) {
		return [];
	}

	var grid = [];
	var maxCol = 0;

	headerRows.forEach(function (row, rowIndex) {
		if (!grid[rowIndex]) {
			grid[rowIndex] = [];
		}

		var colIndex = 0;
		Array.from(row.cells).forEach(function (cell) {
			while (grid[rowIndex][colIndex] !== undefined) {
				colIndex += 1;
			}

			var label = normalizeText(cell.innerText || cell.textContent || "");
			var colSpan = cell.colSpan || 1;
			var rowSpan = cell.rowSpan || 1;

			for (var r = 0; r < rowSpan; r += 1) {
				var targetRow = rowIndex + r;
				if (!grid[targetRow]) {
					grid[targetRow] = [];
				}

				for (var c = 0; c < colSpan; c += 1) {
					grid[targetRow][colIndex + c] = label;
				}
			}

			maxCol = Math.max(maxCol, colIndex + colSpan);
			colIndex += colSpan;
		});
	});

	var captions = [];
	for (var c = 0; c < maxCol; c += 1) {
		var parts = [];
		for (var r = 0; r < grid.length; r += 1) {
			var part = grid[r] && grid[r][c] ? normalizeText(grid[r][c]) : "";
			if (part && parts[parts.length - 1] !== part) {
				parts.push(part);
			}
		}

		captions.push(parts.join(" | ") || "column_" + (c + 1));
	}

	return captions;
}

function getDataRows(tableElement, headerRows) {
	var headerSet = new Set(headerRows);

	if (tableElement.tBodies && tableElement.tBodies.length) {
		return Array.from(tableElement.tBodies).flatMap(function (tbody) {
			return Array.from(tbody.rows).filter(function (row) {
				return !headerSet.has(row);
			});
		});
	}

	return Array.from(tableElement.rows).filter(function (row) {
		if (headerSet.has(row)) {
			return false;
		}

		return row.querySelector("td,th") !== null;
	});
}

function extractRow(row, captions) {
	var cells = [];
	var byCaption = {};
	var keyUsage = {};

	Array.from(row.cells).forEach(function (cell, visualIndex) {
		var value = extractCellValue(cell);
		cells.push(value);

		var caption = captions[visualIndex] || "column_" + (visualIndex + 1);
		var key = toUniqueKey(caption, keyUsage);
		byCaption[key] = value;
	});

	return {
		cells: cells,
		byCaption: byCaption
	};
}

function extractCellValue(cell) {
	var controls = Array.from(cell.querySelectorAll("input, select, textarea, button"));
	var text = normalizeText(cell.innerText || cell.textContent || "");

	if (!controls.length) {
		return text;
	}

	var controlValues = controls.map(function (control) {
		var tag = control.tagName.toLowerCase();
		var type = (control.type || "").toLowerCase();

		if (tag === "input" && (type === "checkbox" || type === "radio")) {
			return {
				tag: tag,
				type: type,
				name: control.name || "",
				value: control.value,
				checked: control.checked,
				disabled: control.disabled
			};
		}

		if (tag === "select") {
			var selected = Array.from(control.selectedOptions).map(function (opt) {
				return {
					value: opt.value,
					text: normalizeText(opt.textContent || "")
				};
			});

			return {
				tag: tag,
				type: "select",
				name: control.name || "",
				value: control.multiple ? selected.map(function (opt) { return opt.value; }) : (selected[0] ? selected[0].value : ""),
				selectedOptions: selected,
				disabled: control.disabled
			};
		}

		return {
			tag: tag,
			type: type || tag,
			name: control.name || "",
			value: control.value !== undefined ? control.value : normalizeText(control.textContent || ""),
			disabled: !!control.disabled
		};
	});

	if (controlValues.length === 1) {
		var single = controlValues[0];
		if (single.type === "checkbox" || single.type === "radio") {
			return single.checked;
		}

		if (!text || text === String(single.value)) {
			return single.value;
		}
	}

	return {
		text: text,
		controls: controlValues,
		html: cell.innerHTML
	};
}

function stringifyCellForCsv(value) {
	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return String(value);
	}

	if (Array.isArray(value)) {
		return value.map(function (item) {
			return stringifyCellForCsv(item);
		}).join(" | ");
	}

	if (typeof value === "object") {
		if ((value.type === "checkbox" || value.type === "radio") && typeof value.checked === "boolean") {
			return value.checked ? "TRUE" : "FALSE";
		}

		if (value.value !== undefined && value.value !== null) {
			if (Array.isArray(value.value)) {
				return value.value.map(function (item) {
					return stringifyCellForCsv(item);
				}).join(" | ");
			}

			if (typeof value.value !== "object") {
				return String(value.value);
			}
		}

		if (value.text) {
			return String(value.text);
		}

		return JSON.stringify(value);
	}

	return String(value);
}

function escapeCsvField(value, delimiter) {
	var text = String(value || "");
	var escaped = text.replace(/"/g, '""');
	var needsQuote = escaped.indexOf(delimiter) !== -1 || escaped.indexOf("\n") !== -1 || escaped.indexOf("\r") !== -1 || escaped.indexOf('"') !== -1;
	return needsQuote ? '"' + escaped + '"' : escaped;
}

function toUniqueKey(caption, keyUsage) {
	var base = (caption || "").trim() || "column";
	if (!keyUsage[base]) {
		keyUsage[base] = 1;
		return base;
	}

	keyUsage[base] += 1;
	return base + "_" + keyUsage[base];
}

function normalizeText(value) {
	return String(value || "")
		.replace(/\s+/g, " ")
		.trim();
}

function inferColumnCount(rows) {
	var max = 0;
	rows.forEach(function (row) {
		max = Math.max(max, row.cells.length);
	});
	return max;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = {
		grabTable: grabTable,
		grabAllTables: grabAllTables,
		grabTableResultToCsv: grabTableResultToCsv
	};
}

if (typeof window !== "undefined") {
	window.grabTable = grabTable;
	window.grabAllTables = grabAllTables;
	window.grabTableResultToCsv = grabTableResultToCsv;
}
