// Import the i18n instance
import i18n from './i18n.js';

// DOM translator
class DOMTranslator {
  constructor() {
    // Initialize the listener
    this.initEventListeners();
  }
  
  // Initialize event listeners
  initEventListeners() {
    // Listen for language change events
    document.addEventListener('languageChanged', () => {
      this.translatePage();
    });
  }
  
  // Translate the entire page
  translatePage() {
    // Translate all elements with a data-i18n attribute
    this.translateElements(document.querySelectorAll('[data-i18n]'));
    
    // Translate the title attribute of all elements with a data-i18n-title attribute
    this.translateAttributes(document.querySelectorAll('[data-i18n-title]'), 'title');
    
    // Translate the placeholder attribute of all elements with a data-i18n-placeholder attribute
    this.translateAttributes(document.querySelectorAll('[data-i18n-placeholder]'), 'placeholder');
  }
  
  // Translate element content
  translateElements(elements) {
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = i18n.translate(key);
      }
    });
  }
  
  // Translate element attributes
  translateAttributes(elements, attributeName) {
    elements.forEach(element => {
      const key = element.getAttribute(`data-i18n-${attributeName}`);
      if (key) {
        element.setAttribute(attributeName, i18n.translate(key));
      }
    });
  }
  
  // Apply all initial translations
  applyTranslations() {
    document.addEventListener('DOMContentLoaded', () => {
      this.translatePage();
    });
  }
}

// Create a singleton instance
const translator = new DOMTranslator();

// Export the instance
export default translator; 