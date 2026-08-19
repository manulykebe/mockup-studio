
// https://devinternal.srppvt4s3r.revvitycloud.eu/elements/entity/ado-10:a00fe1fd-e114-41a0-913e-59e0f6afc9b3?focus=ado-10:19b7b57f-9cdc-4827-a92e-0639e0502242

if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener('DOMContentLoaded', init);
}

function init() {
	console.log('DOM Ready');
	const targetClass = 'binder__content-page-progress--non-blocking';

	// Find the element currently on the page
	const element = document.querySelector(`.${targetClass}`);

	// Exit if the element does not exist at load time
	if (!element) return;

	// Watch the parent node or body for removed elements
	const observer = new MutationObserver((mutations, obs) => {
		for (const mutation of mutations) {
			for (const removedNode of mutation.removedNodes) {
				// Check if the removed node is our target or contains it
				if (
					removedNode.nodeType === Node.ELEMENT_NODE &&
					(removedNode.classList.contains(targetClass) ||
						removedNode.querySelector(`.${targetClass}`))
				) {
					// Run your function here
					myFunction();

					// Stop observing once found and removed
					obs.disconnect();
					return;
				}
			}
		}
	});

	// Start observing the document body
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function myFunction() {
	console.log('The element was removed!');
}
