const TOOLBAR_TAB_BUTTON_SELECTOR = '.toolbar__tab-button.btn.btn-link.btn-sm';
const CLOSE_POPUP_SELECTOR = '[aria-label="Close view"]';
const POPUP_LOAD_QUIET_MS = 300;
const POPUP_LOAD_TIMEOUT_MS = 10000;

/** Resolves once `selector` exists in the DOM, or rejects after `timeoutMs`. */
function waitForElement(selector, timeoutMs) {
  const existing = document.querySelector(selector);
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timed out waiting for "${selector}" to appear.`));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/** Resolves once `predicate()` returns a truthy value, or rejects after `timeoutMs`. */
export function waitForCondition(predicate, timeoutMs) {
  const existing = predicate();
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for condition to become true.'));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const result = predicate();
      if (result) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(result);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/** Resolves once the DOM has had no mutations for `quietMs`, capped at `timeoutMs` total. */
function waitForDomToSettle(quietMs, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    let quietTimer;

    const finish = () => {
      clearTimeout(quietTimer);
      observer.disconnect();
      resolve();
    };

    const observer = new MutationObserver(() => {
      if (Date.now() - start >= timeoutMs) {
        finish();
        return;
      }
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    quietTimer = setTimeout(finish, quietMs);
  });
}

/** Clicks a toolbar tab button (e.g. Fields, Properties, History) and resolves once its popup panel has fully loaded. */
export async function openToolbarPopup(label) {
  const buttons = Array.from(document.querySelectorAll(TOOLBAR_TAB_BUTTON_SELECTOR));
  const button = label
    ? buttons.find((btn) => btn.textContent.trim().toLowerCase() === label.trim().toLowerCase())
    : buttons[0];

  if (!button) {
    throw new Error(`No toolbar tab button found${label ? ` matching "${label}"` : ''}.`);
  }

  button.click();

  await waitForElement(CLOSE_POPUP_SELECTOR, POPUP_LOAD_TIMEOUT_MS);
  await waitForDomToSettle(POPUP_LOAD_QUIET_MS, POPUP_LOAD_TIMEOUT_MS);

  return button;
}

/** Clicks the popup's "Close view" button to dismiss it. */
export function closePopup() {
  const button = document.querySelector(CLOSE_POPUP_SELECTOR);
  if (!button) {
    throw new Error('No "Close view" button found.');
  }

  button.click();
  return button;
}
