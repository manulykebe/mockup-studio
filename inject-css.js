function injectTablesortCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://tristen.ca/tablesort/tablesort.css';
    document.head.appendChild(link);
}
