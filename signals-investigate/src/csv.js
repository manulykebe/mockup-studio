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
