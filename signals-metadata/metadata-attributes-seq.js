(async () => {
    const startSeq = 5;
    const endSeq = 8;
    const baseUrl = 'https://jnj-test.srpstgkj7h.revvitycloud.eu/snconfig/metadata/attribute:';
    const selectorName = '.toolbar__name span span';
    const selectorDescription = '.toolbar__description span span';
    const storageKey = 'metadataCollectorState';

    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const state = {
        running: stored.running === true,
        finished: stored.finished === true,
        nextSeq: typeof stored.nextSeq === 'number' ? stored.nextSeq : null,
        rows: Array.isArray(stored.rows) ? stored.rows : [],
    };

    const currentSeq = (() => {
        const match = document.location.href.match(/attribute:(\d+)(?:[?#]|$)/);
        return match ? Number(match[1]) : null;
    })();

    const escapeCsv = value => `"${String(value).replace(/"/g, '""')}"`;

    function saveState(nextSeq, rows, running = true, finished = false) {
        localStorage.setItem(storageKey, JSON.stringify({ running, finished, nextSeq, rows }));
    }

    function finish(rows) {
        saveState(null, rows, false, true);
        const csvLines = ['seq,toolbar__name,toolbar__description'];
        rows.forEach(({ seq, toolbarName, toolbarDescription }) => {
            csvLines.push([seq, escapeCsv(toolbarName), escapeCsv(toolbarDescription)].join(','));
        });
        window.metadataCSV = csvLines.join('\n');
        console.log('metadataCSV ready');
        console.log(window.metadataCSV);
    }

    function waitForPageReady() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }
            window.addEventListener('load', () => resolve(), { once: true });
            setTimeout(resolve, 1500);
        });
    }

    function waitForElement(selector, timeout = 8000) {
        return new Promise(resolve => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const found = document.querySelector(selector);
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    async function processCurrentPage(seq, rows) {
        await waitForPageReady();
        await waitForElement(selectorName, 8000);
        await waitForElement(selectorDescription, 8000);
        await new Promise(resolve => setTimeout(resolve, 250));

        const toolbarName = document.querySelector(selectorName)?.textContent.trim() || '';
        const toolbarDescription = document.querySelector(selectorDescription)?.textContent.trim() || '';
        const foundAny = toolbarName || toolbarDescription;

        if (foundAny) {
            rows.push({ seq, toolbarName, toolbarDescription });
            console.log(`seq=${seq} toolbar__name="${toolbarName}" toolbar__description="${toolbarDescription}"`);
        }

        if (seq >= endSeq) {
            finish(rows);
            return;
        }

        saveState(seq + 1, rows, true, false);
        document.location = `${baseUrl}${seq + 1}`;
    }

    if (state.finished) {
        console.log('Collector already finished. Use window.metadataCSV for results.');
        return;
    }

    if (state.running) {
        if (currentSeq === null) {
            console.warn('Collector is running but current page is not an attribute page. Redirecting to expected page.');
            if (state.nextSeq !== null) {
                document.location = `${baseUrl}${state.nextSeq}`;
            }
            return;
        }

        if (currentSeq !== state.nextSeq) {
            console.warn(`Expected seq=${state.nextSeq} but found seq=${currentSeq}. Redirecting to expected page.`);
            if (state.nextSeq !== null) {
                document.location = `${baseUrl}${state.nextSeq}`;
            }
            return;
        }

        await processCurrentPage(currentSeq, state.rows);
        return;
    }

    if (currentSeq === startSeq && !state.running) {
        console.log(`Starting collector at startSeq=${startSeq}`);
        saveState(startSeq + 1, [], true, false);
        await processCurrentPage(startSeq, state.rows);
        return;
    }

    console.log(`Initializing collector at seq=${startSeq}`);
    saveState(startSeq, [], true, false);
    if (currentSeq !== startSeq) {
        document.location = `${baseUrl}${startSeq}`;
    }
})();