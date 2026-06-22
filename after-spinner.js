async function waitForSpinner() {
    const selector = 'div.loading.loading-spinner.loading-lg';

    if (document.querySelector(selector)) {
        return;
    }

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
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
        window.dispatchEvent(new CustomEvent('spinner-loaded'));
        alert('Spinner unloaded!');
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
