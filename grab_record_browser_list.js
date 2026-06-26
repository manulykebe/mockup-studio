console.log("grab_record_browser_list.js loaded - v1.2.0");

// usage:
// await grabRecordBrowserList(recordBrowserDiv)
// await grab_record_browser_list(recordBrowserDiv)
// await grabAllRecordBrowserLists(rootElement)

async function grabRecordBrowserList(recordBrowserDiv, options) {
	if (!recordBrowserDiv || !recordBrowserDiv.classList || !recordBrowserDiv.classList.contains("record-browser-list")) {
		throw new TypeError("grabRecordBrowserList expects a <div class=\"record-browser-list\"> element");
	}

	var settings = options || {};
	var includeHtml = settings.includeHtml === true;
	var pageWaitMs = isFiniteNumber(settings.pageWaitMs) ? settings.pageWaitMs : 150;
	var pageTimeoutMs = isFiniteNumber(settings.pageTimeoutMs) ? settings.pageTimeoutMs : 5000;
	var maxPages = Number.isInteger(settings.maxPages) && settings.maxPages > 0 ? settings.maxPages : 100;

	var captions = getCaptions(recordBrowserDiv);
	var pages = [];
	var allRows = [];
	var visitedPages = {};

	// Start at page 1 when pagination is available.
	var hasPagination = getPaginationContainer(recordBrowserDiv) !== null;
	if (hasPagination) {
		await goToPage(recordBrowserDiv, 1, pageWaitMs, pageTimeoutMs);
	}

	var loopCount = 0;
	while (loopCount < maxPages) {
		loopCount += 1;

		var activePage = getActivePageNumber(recordBrowserDiv);
		if (!isFiniteNumber(activePage)) {
			activePage = pages.length + 1;
		}

		if (visitedPages[activePage]) {
			break;
		}
		visitedPages[activePage] = true;

		var rowElements = extractDataRows(recordBrowserDiv);
		var fieldsPerColumn = countFieldsPerColumn(rowElements, captions.length);
		var pageRows = rowElements.map(function (row, rowIndex) {
			var extracted = extractRecordRow(row, captions, includeHtml);
			extracted.index = rowIndex;
			extracted.page = activePage;
			return extracted;
		});

		pages.push({
			page: activePage,
			rows: pageRows,
			meta: {
				rowCount: pageRows.length,
				columnCount: captions.length,
				fieldsPerColumn: fieldsPerColumn
			}
		});

		pageRows.forEach(function (row) {
			row.index = allRows.length;
			allRows.push(row);
		});

		if (!hasPagination) {
			break;
		}

		var moved = await goToNextPage(recordBrowserDiv, pageWaitMs, pageTimeoutMs);
		if (!moved) {
			break;
		}
	}

	var totalFieldsPerColumn = new Array(captions.length).fill(0);
	pages.forEach(function (page) {
		(page.meta.fieldsPerColumn || []).forEach(function (count, idx) {
			totalFieldsPerColumn[idx] += count;
		});
	});

	return {
		captions: captions,
		rows: allRows,
		pages: pages,
		meta: {
			headerRowCount: captions.length > 0 ? 1 : 0,
			dataRowCount: allRows.length,
			columnCount: captions.length,
			pageCount: pages.length,
			paginationDetected: hasPagination,
			startPage: 1,
			fieldsPerColumn: totalFieldsPerColumn
		}
	};
}

async function grabAllRecordBrowserLists(rootElement, options) {
	var scope = rootElement || (typeof document !== "undefined" ? document : null);
	if (!scope || typeof scope.querySelectorAll !== "function") {
		return [];
	}

	var lists = Array.from(scope.querySelectorAll("div.record-browser-list"));
	var results = [];

	for (var i = 0; i < lists.length; i += 1) {
		results.push({
			listIndex: i,
			listClass: normalizeText(lists[i].className || ""),
			result: await grabRecordBrowserList(lists[i], options)
		});
	}

	return results;
}

function grabRecordBrowserResultToCsv(grabResult, options) {
	if (!grabResult || typeof grabResult !== "object") {
		throw new TypeError("grabRecordBrowserResultToCsv expects output from grabRecordBrowserList");
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

function getCaptions(recordBrowserDiv) {
	var headerRow = recordBrowserDiv.querySelector(".record-browser-row-col-header .metadata-row");
	if (!headerRow) {
		return [];
	}

	var columns = Array.from(headerRow.children).filter(function (el) {
		return el && el.nodeType === 1;
	});

	return columns.map(function (col, index) {
		var caption = normalizeText(col.innerText || col.textContent || "");
		return caption || ("column_" + (index + 1));
	});
}

function extractDataRows(recordBrowserDiv) {
	return Array.from(recordBrowserDiv.querySelectorAll(".record-browser-row.clickable .metadata-row.metadata-record"));
}

function extractRecordRow(rowElement, captions, includeHtml) {
	var cells = [];
	var byCaption = {};
	var keyUsage = {};

	Array.from(rowElement.children).forEach(function (cell, visualIndex) {
		var value = extractCellValue(cell, includeHtml);
		cells.push(value);
		var caption = captions[visualIndex] || ("column_" + (visualIndex + 1));
		var key = toUniqueKey(caption, keyUsage);
		byCaption[key] = value;
	});

	return {
		cells: cells,
		byCaption: byCaption
	};
}

function extractCellValue(cell, includeHtml) {
	var controls = Array.from(cell.querySelectorAll("input, select, textarea, button"));
	var icons = Array.from(cell.querySelectorAll("svg"));
	var text = extractTextWithChildMarkers(cell);

	if (!controls.length && !icons.length) {
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
			disabled: !!control.disabled,
			ariaLabel: control.getAttribute("aria-label") || ""
		};
	});

	var iconNames = icons.map(function (icon) {
		return icon.getAttribute("data-icon") || "";
	}).filter(Boolean);

	var value = {
		text: text,
		controls: controlValues,
		icons: iconNames
	};

	if (includeHtml) {
		value.html = cell.innerHTML;
	}

	if (controlValues.length === 1 && !text && !iconNames.length) {
		return controlValues[0];
	}

	return value;
}

function extractTextWithChildMarkers(cell) {
	var text = normalizeText(cell.innerText || cell.textContent || "");
	var childMarkers = Array.from(cell.children).map(function (child) {
		var marker = child.getAttribute("data-testid") || child.getAttribute("aria-label") || child.className || child.tagName.toLowerCase();
		return normalizeText(marker);
	}).filter(Boolean);

	if (!childMarkers.length) {
		return text;
	}

	var markerText = childMarkers.map(function (marker) {
		return "(child of " + marker + ")";
	}).join(" ");

	return text ? (text + " " + markerText) : markerText;
}

function countFieldsPerColumn(rowElements, columnCount) {
	var counts = new Array(columnCount).fill(0);
	rowElements.forEach(function (row) {
		Array.from(row.children).forEach(function (cell, idx) {
			if (idx >= columnCount) {
				return;
			}
			var hasText = normalizeText(cell.innerText || cell.textContent || "") !== "";
			var hasControls = cell.querySelector("input, select, textarea, button") !== null;
			var hasSvg = cell.querySelector("svg") !== null;
			if (hasText || hasControls || hasSvg) {
				counts[idx] += 1;
			}
		});
	});
	return counts;
}

function getPaginationContainer(recordBrowserDiv) {
	return recordBrowserDiv.querySelector(".pagination") || null;
}

function getActivePageNumber(recordBrowserDiv) {
	var activeLink = recordBrowserDiv.querySelector(".pagination .page-item.active .page-link");
	if (!activeLink) {
		return null;
	}
	var value = parseInt(normalizeText(activeLink.textContent || ""), 10);
	return Number.isFinite(value) ? value : null;
}

async function goToPage(recordBrowserDiv, targetPage, waitMs, timeoutMs) {
	var current = getActivePageNumber(recordBrowserDiv);
	if (current === targetPage) {
		return true;
	}

	var pageLinks = Array.from(recordBrowserDiv.querySelectorAll(".pagination .page-link"));
	var targetLink = pageLinks.find(function (link) {
		var val = parseInt(normalizeText(link.textContent || ""), 10);
		return Number.isFinite(val) && val === targetPage;
	});

	if (!targetLink) {
		return false;
	}

	var beforeSignature = getRowSignature(recordBrowserDiv);
	targetLink.click();

	var started = Date.now();
	while ((Date.now() - started) < timeoutMs) {
		await sleep(waitMs);
		var activeNow = getActivePageNumber(recordBrowserDiv);
		var afterSignature = getRowSignature(recordBrowserDiv);
		if (activeNow === targetPage || afterSignature !== beforeSignature) {
			return true;
		}
	}

	return false;
}

async function goToNextPage(recordBrowserDiv, waitMs, timeoutMs) {
	var current = getActivePageNumber(recordBrowserDiv);
	if (!isFiniteNumber(current)) {
		return false;
	}

	var pageLinks = Array.from(recordBrowserDiv.querySelectorAll(".pagination .page-link"));
	var nextNumeric = pageLinks.find(function (link) {
		var val = parseInt(normalizeText(link.textContent || ""), 10);
		return Number.isFinite(val) && val === current + 1;
	});

	if (!nextNumeric) {
		return false;
	}

	var beforeSignature = getRowSignature(recordBrowserDiv);
	nextNumeric.click();

	var started = Date.now();
	while ((Date.now() - started) < timeoutMs) {
		await sleep(waitMs);
		var activeNow = getActivePageNumber(recordBrowserDiv);
		var afterSignature = getRowSignature(recordBrowserDiv);
		if (activeNow === (current + 1) || afterSignature !== beforeSignature) {
			return true;
		}
	}

	return false;
}

function getRowSignature(recordBrowserDiv) {
	var rows = extractDataRows(recordBrowserDiv);
	return rows.map(function (row) {
		return normalizeText(row.textContent || "");
	}).join("||");
}

function sleep(ms) {
	return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function toUniqueKey(caption, keyUsage) {
	var key = normalizeKey(caption || "");
	if (!key) {
		key = "column";
	}

	if (!Object.prototype.hasOwnProperty.call(keyUsage, key)) {
		keyUsage[key] = 0;
		return key;
	}

	keyUsage[key] += 1;
	return key + "_" + (keyUsage[key] + 1);
}

function normalizeKey(value) {
	return normalizeText(value)
		.toLowerCase()
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_]+/g, "")
		.replace(/^_+|_+$/g, "");
}

function normalizeText(value) {
	return String(value || "").replace(/\s+/g, " ").trim();
}

function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
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

		if (value.value !== undefined && value.value !== null && typeof value.value !== "object") {
			return String(value.value);
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
	var mustQuote = text.indexOf(delimiter) >= 0 || text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text.indexOf('"') >= 0;

	if (mustQuote) {
		return '"' + text.replace(/"/g, '""') + '"';
	}

	return text;
}

if (typeof module !== "undefined") {
	module.exports = {
		grabRecordBrowserList: grabRecordBrowserList,
		grab_record_browser_list: grabRecordBrowserList,
		grabAllRecordBrowserLists: grabAllRecordBrowserLists,
		grabRecordBrowserResultToCsv: grabRecordBrowserResultToCsv
	};
} else if (typeof window !== "undefined") {
	window.grabRecordBrowserList = grabRecordBrowserList;
	window.grab_record_browser_list = grabRecordBrowserList;
	window["grab_record-browser-list"] = grabRecordBrowserList;
	window.grabAllRecordBrowserLists = grabAllRecordBrowserLists;
	window.grabRecordBrowserResultToCsv = grabRecordBrowserResultToCsv;
}
