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


waitForSpinner().then(() => {
    window.dispatchEvent(new CustomEvent('spinner-loaded'));
    alert('Spinner unloaded!');
});


