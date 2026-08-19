// Import the i18n module
import { i18n, translator } from './i18n/index.js';

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const exportDataButton = document.getElementById('export-data');
  const importDataButton = document.getElementById('import-data');
  const importFileInput = document.getElementById('import-file');
  const clearDataButton = document.getElementById('clear-data');
  const themeToggleSwitch = document.getElementById('theme-toggle');
  const themeStatus = document.getElementById('theme-status');
  const languageSelect = document.getElementById('language-select');
  
  // Initialize the theme
  initTheme();
  
  // Initialize the language selector
  initLanguageSelector();
  
  // Initialize page translations
  translator.translatePage();
  
  // Initialize the language selector
  function initLanguageSelector() {
    // Get the current language setting
    chrome.storage.local.get('language', (data) => {
      const currentLanguage = data.language || 'en';
      
      // Set the selector's default value
      languageSelect.value = currentLanguage;
      
      // Listen for selector changes
      languageSelect.addEventListener('change', handleLanguageChange);
    });
  }
  
  // Handle language changes
  function handleLanguageChange() {
    const selectedLanguage = languageSelect.value;
    
    // Save the language setting
    chrome.storage.local.set({ language: selectedLanguage });
    
    // Apply the selected language
    if (selectedLanguage === 'auto') {
      i18n.setLanguageByBrowser();
    } else {
      i18n.setLanguage(selectedLanguage);
    }
    
    // Show a message
    showMessage(i18n.t('language_changed'), 'success');
  }
  
  // Export data
  exportDataButton.addEventListener('click', async () => {
    try {
      // Get all script data
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      
      // Create the data object
      const exportData = {
        version: 1,
        scripts,
        exportDate: Date.now()
      };
      
      // Convert to a JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create a download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `js-injector-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Release the URL object
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      showMessage(i18n.t('data_export_success'), 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showMessage(i18n.t('data_export_failed'), 'error');
    }
  });
  
  // Import data button event
  importDataButton.addEventListener('click', () => {
    importFileInput.click();
  });
  
  // Handle file selection
  importFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    try {
      // Read the file contents
      const fileContent = await readFileAsText(file);
      const importData = JSON.parse(fileContent);
      
      // Validate the data format
      if (!importData.scripts || typeof importData.scripts !== 'object') {
        throw new Error(i18n.t('invalid_data_format'));
      }
      
      // Confirm the import
      if (confirm(i18n.t('import_confirmation'))) {
        // Save the imported scripts
        await chrome.storage.local.set({ scripts: importData.scripts });
        showMessage(i18n.t('data_import_success'), 'success');
      }
    } catch (error) {
      console.error('Import failed:', error);
      showMessage(`${i18n.t('data_import_failed')} ${error.message}`, 'error');
    }
    
    // Reset the file input
    importFileInput.value = '';
  });
  
  // Clear all data
  clearDataButton.addEventListener('click', async () => {
    if (confirm(i18n.t('clear_data_confirmation'))) {
      try {
        await chrome.storage.local.set({ scripts: {} });
        showMessage(i18n.t('clear_data_success'), 'success');
      } catch (error) {
        console.error('Error clearing data:', error);
        showMessage(i18n.t('clear_data_failed'), 'error');
      }
    }
  });
  
  // Show a message
  function showMessage(message, type) {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create the message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Add it to the page
    document.body.appendChild(messageElement);
    
    // Remove it automatically after 3 seconds
    setTimeout(() => {
      messageElement.style.opacity = '0';
      setTimeout(() => messageElement.remove(), 500);
    }, 3000);
  }
  
  // Read the file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
  
  // Initialize the theme
  function initTheme() {
    // Get the theme setting from local storage
    chrome.storage.local.get('darkMode', (data) => {
      const isDarkMode = data.darkMode === true;
      applyTheme(isDarkMode);
      
      // Update the switch state
      themeToggleSwitch.checked = isDarkMode;
      updateThemeStatusText(isDarkMode);
    });
    
    // Add the theme toggle listener
    themeToggleSwitch.addEventListener('change', toggleTheme);
  }
  
  // Apply the theme
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  
  // Update the theme status text
  function updateThemeStatusText(isDarkMode) {
    themeStatus.textContent = isDarkMode ? i18n.t('on') : i18n.t('off');
    themeStatus.setAttribute('data-i18n', isDarkMode ? 'on' : 'off');
  }
  
  // Toggle the theme
  function toggleTheme() {
    const isDarkMode = themeToggleSwitch.checked;
    
    // Apply the theme
    applyTheme(isDarkMode);
    
    // Update the status text
    updateThemeStatusText(isDarkMode);
    
    // Save the theme setting
    chrome.storage.local.set({ darkMode: isDarkMode });
  }
}); 