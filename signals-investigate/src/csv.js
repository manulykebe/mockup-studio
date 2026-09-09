export const CSV_DELIMITER = ';';

export function escapeCsvField(field) {
  const value = String(field ?? '');
  if (new RegExp(`["${CSV_DELIMITER}\n]`).test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows, headers) {
  const allRows = headers ? [headers, ...rows] : rows;
  return allRows
    .map((row) => row.map(escapeCsvField).join(CSV_DELIMITER))
    .join('\n');
}

// Parses CSV_DELIMITER-separated text (with quoted-field support, mirroring escapeCsvField) into rows of strings.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === CSV_DELIMITER) {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    pushRow();
  }

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

// Parses CSV text using its first row as headers, returning one plain object per data row.
export function csvToObjects(text) {
  const [headers, ...dataRows] = parseCsv(text);
  if (!headers) {
    return [];
  }

  return dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}
