/**
 * Adds a column to the first table in the document.
 *
 * @param {number} [position=-1] - Zero-based insertion index. Use -1 to append at the end.
 * @param {string} [headerText='Measurement'] - Header text used when the table has TH cells.
 * @param {Node|Node[]|string|number|null} [cellContent=''] - Content for body cells.
 *   - Node: cloned into every new cell
 *   - Node[]: one item per row (falls back to empty when missing)
 *   - string/number: converted to text
 */
function addColumn(position = -1, headerText = 'Measurement', cellContent = '') {
	const table = document.getElementsByClassName('shadow-md')[0].shadowRoot.getElementById('MeasTable');
	if (!table) {
		throw new Error('No table element found in the current document.');
	}

	const hasHeader = Boolean(table.querySelector('th'));
	const headerRows = hasHeader
		? Array.from(table.querySelectorAll('thead tr, tr')).filter((row) => row.querySelector('th'))
		: [];

	const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
	const rows = bodyRows.length > 0 ? bodyRows : Array.from(table.querySelectorAll('tr')).filter((row) => !row.querySelector('th'));

	const referenceRow = headerRows[0] || rows[0] || table.querySelector('tr');
	if (!referenceRow) {
		return;
	}

	const referenceCells = referenceRow.querySelectorAll('th, td');
	const maxIndex = referenceCells.length;
	const insertIndex = position < 0 ? maxIndex : Math.max(0, Math.min(position, maxIndex));

	if (hasHeader) {
		headerRows.forEach((row) => {
			const th = document.createElement('th');
			th.textContent = headerText;
			insertCellAt(row, th, insertIndex);
		});
	}

	rows.forEach((row, rowIndex) => {
		const td = document.createElement('td');
		setCellContent(td, cellContent, rowIndex);
		insertCellAt(row, td, insertIndex);
	});
}

function insertCellAt(row, cell, index) {
	const cells = row.querySelectorAll('th, td');
	if (index >= cells.length) {
		row.appendChild(cell);
		return;
	}
	row.insertBefore(cell, cells[index]);
}

function setCellContent(cell, content, rowIndex) {
	if (Array.isArray(content)) {
		const rowContent = content[rowIndex];
		appendContent(cell, rowContent);
		return;
	}

	appendContent(cell, content);
}

function appendContent(cell, content) {
	if (content == null) {
		return;
	}

	if (content instanceof Node) {
		cell.appendChild(content.cloneNode(true));
		return;
	}

	if (typeof content === 'string') {
		const autoMatch = content.match(/^Auto-(\d+)$/);
		if (autoMatch) {
			const length = Number.parseInt(autoMatch[1], 10);
			cell.textContent = generateRandomString(length);
			return;
		}
	}

	cell.textContent = String(content);
}

function generateRandomString(length) {
	const size = Math.max(0, Number.parseInt(length, 10) || 0);
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < size; i += 1) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
}


document.getElementsByClassName('shadow-md')[0].shadowRoot
	.getElementById('MeasTable')
	.querySelectorAll('button').forEach((button) => button.remove())


const measureBtn = document.createElement('button');
measureBtn.textContent = 'measure';

addColumn(position = -1, headerText = 'Measurement', cellContent = measureBtn)

// https://purge.jsdelivr.net/gh/manulykebe/mockup-studio@main/add_column.js
loadJSReady(`https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@main/signals/main.js?_now=${Date.now()}`)
