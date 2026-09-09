// Opens a native file picker and resolves with the selected File, or rejects if the user cancels.
export function pickFile(accept = '.csv,text/csv') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) {
        reject(new Error('No file selected.'));
        return;
      }
      resolve(file);
    }, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

// Reads a File/Blob as text.
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
