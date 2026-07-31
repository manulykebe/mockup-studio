const TOOLBAR_TAB_BUTTON_SELECTOR = '.toolbar__tab-button.btn.btn-link.btn-sm';
const CLOSE_POPUP_SELECTOR = '[aria-label="Close view"]';

/** Clicks a toolbar tab button (e.g. Fields, Properties, History) to open its popup panel. */
export function openToolbarPopup(label) {
  const buttons = Array.from(document.querySelectorAll(TOOLBAR_TAB_BUTTON_SELECTOR));
  const button = label
    ? buttons.find((btn) => btn.textContent.trim().toLowerCase() === label.trim().toLowerCase())
    : buttons[0];

  if (!button) {
    throw new Error(`No toolbar tab button found${label ? ` matching "${label}"` : ''}.`);
  }

  button.click();
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
