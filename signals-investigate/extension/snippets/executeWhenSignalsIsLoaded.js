
// https://devinternal.srppvt4s3r.revvitycloud.eu/elements/entity/ado-10:a00fe1fd-e114-41a0-913e-59e0f6afc9b3?focus=ado-10:19b7b57f-9cdc-4827-a92e-0639e0502242

// Present on every page type (binder, config, admin, ...) until the app shell has mounted.
const appShellLoadingSelector = '#app-loading';
// Only present on the experiment/binder content view; absent on other sub-apps (e.g. Configuration).
const contentLoadingSelector = '.binder__content-page-progress--non-blocking';
const contentReadySelector = '#btn-add-element-content';
// Time to allow the content loading indicator to appear before treating the page as one
// that never shows one (simple pages, or sub-apps without a binder content view).
const noIndicatorGraceMs = 5000;

// Reset the stale ready flag from a previous injection (e.g. a prior TOC navigation)
// so the background script's readiness poll doesn't resolve prematurely on this one.
window.__signalsPageReady = false;

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', waitForSignalsReady, { once: true });
} else {
	waitForSignalsReady();
}

function waitForSignalsReady() {
	const root = document.documentElement;
	if (!root) return;

	let shellMounted = false;
	let contentLoadingSeen = false;
	let hasRun = false;
	let graceTimer = null;

	const runOnce = () => {
		if (hasRun) return;
		hasRun = true;
		if (graceTimer) clearTimeout(graceTimer);
		observer.disconnect();
		myFunction();
	};

	const isVisible = (element) => {
		const style = getComputedStyle(element);
		const rect = element.getBoundingClientRect();
		return style.display !== 'none' &&
			style.visibility !== 'hidden' &&
			style.opacity !== '0' &&
			rect.width > 0 &&
			rect.height > 0;
	};

	const isContentLoadingVisible = () => {
		return [...document.querySelectorAll(contentLoadingSelector)].some(isVisible);
	};

	const scheduleGraceCheck = () => {
		if (graceTimer || contentLoadingSeen) return;
		graceTimer = setTimeout(() => {
			graceTimer = null;
			if (!contentLoadingSeen && !isContentLoadingVisible()) {
				runOnce();
			}
		}, noIndicatorGraceMs);
	};

	const checkReady = () => {
		if (!shellMounted) {
			if (document.querySelector(appShellLoadingSelector)) return;
			shellMounted = true;
			scheduleGraceCheck();
		}

		if (isContentLoadingVisible()) {
			contentLoadingSeen = true;
			return;
		}

		if (contentLoadingSeen && document.querySelector(contentReadySelector)) {
			runOnce();
		}
	};

	// Observe from the start so a loading indicator that appears and
	// disappears quickly (fast pages) is never missed between checks.
	const observer = new MutationObserver(checkReady);

	observer.observe(root, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['class', 'style', 'hidden', 'aria-busy'],
	});

	// Handle pages that were already loaded before the snippet was injected.
	checkReady();
}

function myFunction() {
	window.__signalsPageReady = true;
	window.dispatchEvent(new Event('signals-page-ready'));
}
