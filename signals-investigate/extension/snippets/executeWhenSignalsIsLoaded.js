
// https://devinternal.srppvt4s3r.revvitycloud.eu/elements/entity/ado-10:a00fe1fd-e114-41a0-913e-59e0f6afc9b3?focus=ado-10:19b7b57f-9cdc-4827-a92e-0639e0502242

const targetSelector = '.binder__content-page-progress--non-blocking';
const signalsReadySelector = '#btn-add-element-content';
// Time to allow a loading indicator to appear before treating the page as a
// simple/fast page that never shows one.
const noSpinnerGraceMs = 5000;

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

	let targetSeen = false;
	let hasRun = false;

	const runOnce = () => {
		if (hasRun) return;
		hasRun = true;
		clearTimeout(graceTimer);
		observer.disconnect();
		myFunction();
	};

	const isLoadingVisible = () => {
		return [...document.querySelectorAll(targetSelector)].some(element => {
			const style = getComputedStyle(element);
			const rect = element.getBoundingClientRect();
			return style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				style.opacity !== '0' &&
				rect.width > 0 &&
				rect.height > 0;
		});
	};

	const checkReady = () => {
		if (isLoadingVisible()) {
			targetSeen = true;
			return;
		}

		if (targetSeen && document.querySelector(signalsReadySelector)) {
			runOnce();
		}
	};

	// Observe from the start so a loading indicator that appears and
	// disappears quickly (fast pages) is never missed between checks.
	const observer = new MutationObserver((mutations) => {
		if (targetSeen || mutations.length > 0) checkReady();
	});

	observer.observe(root, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['class', 'style', 'hidden', 'aria-busy'],
	});

	// Handle pages that were already loaded before the snippet was injected.
	checkReady();

	// If no loading indicator ever shows up, the page loaded almost
	// immediately; treat it as ready once the ready selector is present.
	const graceTimer = setTimeout(() => {
		if (!targetSeen && document.querySelector(signalsReadySelector)) {
			runOnce();
		}
	}, noSpinnerGraceMs);
}

function myFunction() {
	window.__signalsPageReady = true;
	window.dispatchEvent(new Event('signals-page-ready'));
}
