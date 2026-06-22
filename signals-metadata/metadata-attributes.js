(function () {
    const PAGE_ROW_SELECTOR = '.metadata-row.metadata-record';
    const headerSet = new Set();
    const allRecords = [];

    function extractRows() {
        return Array.from(document.querySelectorAll(PAGE_ROW_SELECTOR)).map(row => {
            const cols = Array.from(row.querySelectorAll('[class^="metadata-"]'));
            const record = {};

            cols.forEach(col => {
                const metadataClass = Array.from(col.classList).find(c => c.startsWith('metadata-'));
                if (!metadataClass) return;

                const fieldName = metadataClass.replace(/^metadata-/, '');
                let value = col.textContent.trim();

                if (fieldName === 'access-control') {
                    value = col.querySelector('svg') ? '1' : '0';
                }

                record[fieldName] = value;
                headerSet.add(fieldName);
            });

            return record;
        });
    }

    function parsePageNumber(text) {
        const match = text && text.match(/\d+/);
        return match ? Number(match[0]) : null;
    }

    function getCurrentPage() {
        const current = document.querySelector('.pagination .page-item.active .page-link');
        if (!current) return null;
        return parsePageNumber(current.textContent);
    }

    function getPageLink(pageNumber) {
        return Array.from(document.querySelectorAll('.pagination .page-item .page-link'))
            .find(link => parsePageNumber(link.textContent) === pageNumber);
    }

    function getNumericPageLinks() {
        return Array.from(document.querySelectorAll('.pagination .page-item .page-link'))
            .map(link => {
                const page = parsePageNumber(link.textContent);
                return Number.isInteger(page) ? { page, link } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.page - b.page);
    }

    function getNextPageLink() {
        const currentPage = getCurrentPage() || 0;
        const pages = getNumericPageLinks();
        return pages.find(item => item.page > currentPage) || null;
    }

    function waitForPageChange(oldPage, oldRowsHtml) {
        const start = Date.now();
        return new Promise(resolve => {
            const interval = setInterval(() => {
                const currentPage = getCurrentPage();
                const rows = document.querySelectorAll(PAGE_ROW_SELECTOR);
                const newRowsHtml = rows.length ? rows[0].outerHTML : '';

                if ((currentPage !== null && currentPage !== oldPage) || newRowsHtml !== oldRowsHtml) {
                    clearInterval(interval);
                    resolve();
                } else if (Date.now() - start > 8000) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    function buildCsv(records) {
        const headers = Array.from(headerSet);
        const csvLines = [headers.join(',')];

        records.forEach(record => {
            const values = headers.map(name => {
                const value = record[name] || '';
                return `"${value.replace(/"/g, '""')}"`;
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n');
    }

    async function goToPage(pageNumber) {
        const link = getPageLink(pageNumber);
        if (!link) return false;

        const oldPage = getCurrentPage();
        const oldRows = document.querySelectorAll(PAGE_ROW_SELECTOR);
        const oldRowsHtml = oldRows.length ? oldRows[0].outerHTML : '';

        link.click();
        await waitForPageChange(oldPage, oldRowsHtml);
        return getCurrentPage() === pageNumber;
    }

    async function collectAllPages() {
        const pageLinks = getNumericPageLinks();
        if (pageLinks.length === 0) {
            allRecords.push(...extractRows());
        } else {
            if (getCurrentPage() !== 1) {
                await goToPage(1);
            }
            allRecords.push(...extractRows());

            while (true) {
                const nextPage = getNextPageLink();
                if (!nextPage) break;

                const pageNumber = nextPage.page;
                const currentPage = getCurrentPage();
                if (!pageNumber || pageNumber <= currentPage) break;

                const success = await goToPage(pageNumber);
                if (!success) break;
                allRecords.push(...extractRows());
            }
        }

        window.metadataCSV = buildCsv(allRecords);
        console.log(window.metadataCSV);
    }

    window.metadataCSV = '';
    collectAllPages();
})();