
// https://devinternal.srppvt4s3r.revvitycloud.eu/elements/entity/ado-10:a00fe1fd-e114-41a0-913e-59e0f6afc9b3?focus=ado-10:19b7b57f-9cdc-4827-a92e-0639e0502242

const targetSelector = '.binder__content-page-progress--non-blocking';
const signalsReadySelector = '#btn-add-element-content';
const initialWaitMs = 5000;

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		setTimeout(waitForSignalsReady, initialWaitMs);
	}, { once: true });
} else {
	setTimeout(waitForSignalsReady, initialWaitMs);
}

function waitForSignalsReady() {
	const root = document.documentElement;
	if (!root) return;

	let targetSeen = Boolean(document.querySelector(targetSelector));
	let hasRun = false;

	const runOnce = () => {
		if (hasRun) return;
		hasRun = true;
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
}

function myFunction() {
	window.__signalsPageReady = true;
	window.dispatchEvent(new Event('signals-page-ready'));
}
