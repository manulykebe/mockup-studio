async function waitForSpinner() {
    const selector = 'div.loading.loading-spinner.loading-lg';

    if (!document.querySelector(selector)) {
        return;
    }

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (!document.querySelector(selector)) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    });
}

function runAfterSpinner() {
    waitForSpinner().then(() => {
        window.dispatchEvent(new CustomEvent('spinner-unloaded'));
        makeCollapsible();
        new Tablesort(document.getElementsByClassName('table table-zebra w-full')[0])
        document.getElementsByClassName('table table-zebra w-full')[0].classList.remove('table')
        // document.getElementsByClassName('table-zebra w-full')[0].classList.add('border-spacing-y-1') //tailwind needs to compile
        document.getElementsByClassName('table-zebra w-full')[0].style.borderCollapse='separate'    
        document.getElementsByClassName('table-zebra w-full')[0].style.borderSpacing='0px 4px'
    });
}


// Call the function when DOM is ready with 1 second delay
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runAfterSpinner, 1000);
    });
} else {
    setTimeout(runAfterSpinner, 1000);
}


const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdn.datatables.net/3.0.0/css/dataTables.dataTables.min.css';
document.head.appendChild(link);

