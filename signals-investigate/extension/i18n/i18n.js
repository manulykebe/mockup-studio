// Import language files
import en from './en.js';
import nl from './nl.js';

class I18n {
  constructor() {
    // Available languages
    this.languages = {
      en: en,
      nl: nl
    };
    
    // Default language
    this.defaultLanguage = 'en';
    
    // Current language
    this.currentLanguage = this.defaultLanguage;
    
    // Initialize
    this.init();
  }
  
  // Initialize language settings
  async init() {
    try {
      // Get the language setting from storage
      const result = await chrome.storage.local.get('language');
      
      if (result.language) {
        // Migrate the previous Chinese locale to Dutch.
        const language = result.language === 'zh' ? 'nl' : result.language;
        this.setLanguage(language);
        if (language !== result.language) {
          chrome.storage.local.set({ language });
        }
      } else {
        // No language is set; use and save the default language (English)
        this.setLanguage(this.defaultLanguage);
        chrome.storage.local.set({ language: this.defaultLanguage });
      }
    } catch (error) {
      console.error('Failed to initialize language settings:', error);
      // Use the default language
      this.setLanguage(this.defaultLanguage);
      // Try to save the setting
      try {
        chrome.storage.local.set({ language: this.defaultLanguage });
      } catch (e) {
        console.error('Failed to save the default language setting:', e);
      }
    }
  }
  
  // Select a language based on browser settings
  setLanguageByBrowser() {
    const browserLang = navigator.language.toLowerCase().split('-')[0];
    
    // Check whether the language is supported
    if (this.languages[browserLang]) {
      this.setLanguage(browserLang);
    } else {
      // Use the default language when unsupported
      this.setLanguage(this.defaultLanguage);
    }
  }
  
  // Set the current language
  setLanguage(lang) {
    if (this.languages[lang]) {
      this.currentLanguage = lang;
      // Save the language setting to storage
      chrome.storage.local.set({ language: lang });
      // Notify listeners of the language change
      this.notifyLanguageChange();
      return true;
    }
    return false;
  }
  
  // Get the current language
  getLanguage() {
    return this.currentLanguage;
  }
  
  // Get translated text
  translate(key) {
    const langData = this.languages[this.currentLanguage];
    
    if (langData && langData[key]) {
      return langData[key];
    }
    
    // If the current language has no translation, try the default language
    if (this.currentLanguage !== this.defaultLanguage) {
      const defaultLangData = this.languages[this.defaultLanguage];
      if (defaultLangData && defaultLangData[key]) {
        return defaultLangData[key];
      }
    }
    
    // If no translation is found, return the key
    return key;
  }
  
  // Use t as an alias for translate
  t(key) {
    return this.translate(key);
  }
  
  // Notify listeners of the language change
  notifyLanguageChange() {
    if (typeof document === 'undefined') {
      return;
    }

    // Create a custom event
    const event = new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    });
    
    // Dispatch the event
    document.dispatchEvent(event);
  }
  
  // Get all available languages
  getAvailableLanguages() {
    return Object.keys(this.languages);
  }
}

// Create a singleton instance
const i18n = new I18n();

// Export the instance
export default i18n; 