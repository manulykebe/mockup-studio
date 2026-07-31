export function downloadCsv(csvContent, filename) {
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
export function getUrlPrefix(location) {
  return location.hostname.split('.')[0] || 'export';
}
