(function () {
    const activeRequests = new Set();
    let resolveIdle;
    let idleResolved = false;
    let pageLoaded = document.readyState !== 'loading';

    const ajaxIdlePromise = new Promise((resolve) => {
        resolveIdle = resolve;
    });

    function maybeResolveIdle() {
        if (!idleResolved && pageLoaded && activeRequests.size === 0) {
            idleResolved = true;
            resolveIdle();
        }
    }

    function trackPromise(promise) {
        activeRequests.add(promise);
        promise.finally(() => {
            activeRequests.delete(promise);
            maybeResolveIdle();
        });
        return promise;
    }

    const originalFetch = window.fetch;
    if (originalFetch) {
        window.fetch = function (...args) {
            const promise = originalFetch.apply(this, args);
            return trackPromise(promise);
        };
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (...args) {
        this.__ajaxTrackInitialized = false;
        return originalXhrOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        if (!this.__ajaxTrackInitialized) {
            this.__ajaxTrackInitialized = true;
            activeRequests.add(this);
            this.addEventListener('loadend', () => {
                activeRequests.delete(this);
                maybeResolveIdle();
            }, { once: true });
        }
        return originalXhrSend.apply(this, args);
    };

    window.waitForAjaxIdle = function () {
        if (idleResolved) {
            return Promise.resolve();
        }
        maybeResolveIdle();
        return ajaxIdlePromise;
    };

    window.addEventListener('load', () => {
        pageLoaded = true;
        maybeResolveIdle();
    });
})();
