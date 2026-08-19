// Import the i18n module
import { i18n, translator } from './i18n/index.js';

document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  const currentDomainEl = document.getElementById('current-domain');
  const scriptStatusEl = document.getElementById('script-status');
  const addScriptBtn = document.getElementById('add-script');
  const editScriptBtn = document.getElementById('edit-script');
  const manageScriptsBtn = document.getElementById('manage-scripts');
  const optionsBtn = document.getElementById('options');
  const toggleInjectionSwitch = document.getElementById('toggle-injection');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  const langToggleBtn = document.getElementById('lang-toggle');
  
  // Code editor elements
  const codeContainer = document.getElementById('code-container');
  const codeEditorDiv = document.getElementById('code-editor');
  const codeTitle = document.getElementById('code-title');
  const scriptNameInput = document.getElementById('script-name-input');
  const editNameBtn = document.getElementById('edit-name');
  const toggleEditBtn = document.getElementById('toggle-edit');
  const refreshPageBtn = document.getElementById('refresh-page');
  const codeStatus = document.getElementById('code-status');
  const saveScriptBtn = document.getElementById('save-script');
  const emptyState = document.getElementById('empty-state');
  const createScriptBtn = document.getElementById('create-script');
  const toastContainer = document.getElementById('toast-container');
  
  // Get the current tab URL
  let currentDomain = '';
  let currentTabId = null;
  let currentTabUrl = '';
  let matchedScriptId = null;
  let currentScript = null;
  let isEditMode = true; // Default to edit mode
  let isEditingName = false;
  let isScriptEnabled = false;
  let isDarkMode = false; // Dark mode state
  let editor = null; // Keep the editor variable in the outer scope
  
  // Initialize the theme
  initTheme();
  
  // Initialize the UI in edit mode
  // Change the edit button to a save icon
  toggleEditBtn.innerHTML = '<span>✓</span>';
  toggleEditBtn.title = i18n.t('save_edit');
  
  // Update the status text
  if (codeStatus) {
    codeStatus.textContent = i18n.t('edit_mode');
  }
  
  // Wait for i18n initialization
  await waitForI18nInit();
  
  // Initialize page translations
  translator.translatePage();
  
  // Initialize the language switch button
  initLangToggle();
  
  // Initialize the theme
  function initTheme() {
    // Get the theme setting from local storage
    chrome.storage.local.get('darkMode', (data) => {
      isDarkMode = data.darkMode === true;
      applyTheme(isDarkMode);
      
      // Update the toggle button state
      if (toggleThemeBtn) {
        toggleThemeBtn.innerHTML = isDarkMode ? '<span>☀️</span>' : '<span>🌙</span>';
        toggleThemeBtn.title = isDarkMode ? i18n.t('light_theme_title') : i18n.t('dark_theme_title');
      }
    });
  }
  
  // Apply the theme
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (editor) {
        editor.setOption('theme', 'monokai'); // Dark theme
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (editor) {
        editor.setOption('theme', 'default'); // Light theme
      }
    }
  }
  
  // Toggle the theme
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    
    // Apply the theme
    applyTheme(isDarkMode);
    
    // Update the toggle button state
    if (toggleThemeBtn) {
      toggleThemeBtn.innerHTML = isDarkMode ? '<span>☀️</span>' : '<span>🌙</span>';
      toggleThemeBtn.title = isDarkMode ? i18n.t('light_theme_title') : i18n.t('dark_theme_title');
    }
    
    // Save the theme setting
    chrome.storage.local.set({ darkMode: isDarkMode });
  }
  
  // Initialize the CodeMirror editor
  editor = CodeMirror(codeEditorDiv, {
    value: '',
    mode: 'javascript',
    theme: isDarkMode ? 'monokai' : 'default', // Set the editor theme to match the current theme
    lineNumbers: true,
    tabSize: 2,
    indentWithTabs: false,
    indentUnit: 2,
    matchBrackets: true,
    autoCloseBrackets: true,
    readOnly: false, // Default to editable mode instead of read-only mode
    lineWrapping: false, // Keep code tidy by disabling line wrapping
    scrollbarStyle: 'native', // Use the native scrollbar style
    viewportMargin: Infinity, // Render content outside the viewport
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'Tab': function(cm) {
        const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
        cm.replaceSelection(spaces);
      }
    }
  });
  
  // Update the status display
  function updateStatusDisplay(isActive, statusText) {
    // Update the text while preserving the status indicator
    const statusIndicator = scriptStatusEl.querySelector('.status-indicator');
    
    // Remove the "Status: " prefix from the status text
    const displayText = statusText.replace('Status: ', '');
    scriptStatusEl.textContent = displayText;
    scriptStatusEl.insertAdjacentElement('afterbegin', statusIndicator);
    
    // Update the status classes
    if (isActive) {
      scriptStatusEl.classList.add('status-active');
      scriptStatusEl.classList.remove('status-inactive');
      isScriptEnabled = true;
      toggleInjectionSwitch.checked = true;
    } else {
      scriptStatusEl.classList.remove('status-active');
      scriptStatusEl.classList.add('status-inactive');
      isScriptEnabled = false;
      toggleInjectionSwitch.checked = false;
    }
  }
  
  // Enable or disable the toggle switch
  function setToggleSwitchState(enabled) {
    toggleInjectionSwitch.disabled = !enabled;
    const switchLabel = toggleInjectionSwitch.closest('.switch');
    if (switchLabel) {
      if (enabled) {
        switchLabel.removeAttribute('data-disabled');
      } else {
        switchLabel.setAttribute('data-disabled', 'true');
      }
    }
  }
  
  // Show the code
  function showCode(script) {
    currentScript = script;
    codeContainer.classList.remove('hidden');
    codeTitle.textContent = script.name || i18n.t('unnamed_script');
    scriptNameInput.value = script.name || i18n.t('unnamed_script');
    editor.setValue(script.code || '');
    emptyState.classList.add('hidden');
    codeEditorDiv.style.display = '';
    editor.refresh(); // Refresh the editor to ensure correct rendering
    setEditMode(true); // Default to edit mode instead of read-only mode
    
    // Ensure the save button is visible
    saveScriptBtn.classList.remove('hidden');
  }
  
  // Show the empty state
  function showEmptyState() {
    currentScript = null;
    codeContainer.classList.remove('hidden');
    codeEditorDiv.style.display = 'none';
    emptyState.classList.remove('hidden');
    saveScriptBtn.classList.add('hidden');
  }
  
  // Set the edit mode
  function setEditMode(enabled) {
    isEditMode = enabled;
    editor.setOption('readOnly', !enabled);
    
    if (enabled) {
      codeStatus.textContent = i18n.t('edit_mode');
      toggleEditBtn.innerHTML = '<span>✓</span>';
      toggleEditBtn.title = i18n.t('save_edit');
      saveScriptBtn.classList.remove('hidden');
    } else {
      codeStatus.textContent = i18n.t('read_mode');
      toggleEditBtn.innerHTML = '<span>✎</span>';
      toggleEditBtn.title = i18n.t('switch_edit');
      saveScriptBtn.classList.add('hidden');
    }
  }
  
  // Refresh the current page
  function refreshPage() {
    if (!currentTabId) {
      showToast(i18n.t('refresh_error'), 'error');
      return;
    }
    
    try {
      // Use chrome.tabs.reload to refresh the current page
      chrome.tabs.reload(currentTabId);
      showToast(i18n.t('refresh_in_progress'), 'info');
      
      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error('Error refreshing page:', error);
      showToast(i18n.t('refresh_failed') + ': ' + error.message, 'error');
    }
  }
  
  // Toggle name editing
  function toggleEditName() {
    if (isEditingName) {
      // Save the name
      const newName = scriptNameInput.value.trim();
      if (newName) {
        currentScript.name = newName;
        codeTitle.textContent = newName;
        
        // In edit mode, save the name to the script object but not to storage
        if (!isEditMode) {
          // Outside edit mode, save directly to storage
          saveScriptName(newName);
        }
      }
      
      // Hide the input and show the title
      scriptNameInput.classList.add('hidden');
      codeTitle.classList.remove('hidden');
      editNameBtn.innerHTML = '<span>✏️</span>';
      isEditingName = false;
    } else {
      // Show the input and hide the title
      scriptNameInput.value = currentScript.name || i18n.t('unnamed_script');
      scriptNameInput.classList.remove('hidden');
      codeTitle.classList.add('hidden');
      scriptNameInput.focus();
      scriptNameInput.select();
      editNameBtn.innerHTML = '<span>✓</span>';
      isEditingName = true;
    }
  }
  
  // Save the script name
  async function saveScriptName(newName) {
    if (!currentScript || !matchedScriptId) return;
    
    try {
      // Get all current scripts
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      
      // Update the script name
      if (scripts[matchedScriptId]) {
        scripts[matchedScriptId].name = newName;
        
        // Save back to storage
        await chrome.storage.local.set({ scripts });
        
        showToast(i18n.t('name_updated'), 'success');
      }
    } catch (error) {
      console.error('Error saving script name:', error);
      showToast(i18n.t('name_update_failed') + ': ' + error.message, 'error');
    }
  }
  
  // Save the script
  async function saveScript() {
    if (!currentScript) return;
    
    try {
      // Save the name first when it is being edited
      if (isEditingName) {
        toggleEditName();
      }
      
      // Get all active and disabled scripts
      const data = await chrome.storage.local.get(['scripts', '_disabledScripts']);
      const scripts = data.scripts || {};
      const disabledScripts = data._disabledScripts || {};
      
      // Check whether this is a new script with a temporary ID
      const isNewScript = matchedScriptId.startsWith('temp_');
      
      // Get the current time
      const currentTime = Date.now();
      
      // Prepare the script data
      const scriptData = {
        domain: currentDomain,
        name: currentScript.name,
        code: editor.getValue(),
        createdAt: currentScript.createdAt || currentTime,
        updatedAt: currentTime
      };
      
      if (isNewScript) {
        // Create a real ID for the new script
        const realId = 'script_' + currentTime;
        matchedScriptId = realId;
        
        // Choose the storage location based on the enabled state
        if (isScriptEnabled) {
          scripts[realId] = scriptData;
        } else {
          disabledScripts[realId] = scriptData;
        }
        
        // Update the state
        updateStatusDisplay(isScriptEnabled, isScriptEnabled ? i18n.t('status_injected') : i18n.t('status_disabled'));
        editScriptBtn.disabled = false;
      } else {
        // Update the existing script by first determining its storage location
        const scriptInActive = scripts[matchedScriptId] !== undefined;
        const scriptInDisabled = disabledScripts[matchedScriptId] !== undefined;
        
        // Preserve the original creation time
        if (scriptInActive && scripts[matchedScriptId].createdAt) {
          scriptData.createdAt = scripts[matchedScriptId].createdAt;
        } else if (scriptInDisabled && disabledScripts[matchedScriptId].createdAt) {
          scriptData.createdAt = disabledScripts[matchedScriptId].createdAt;
        }
        
        if (isScriptEnabled) {
          // The script belongs in the active list
          if (scriptInDisabled) {
            // Move the script to the active list if it is disabled
            delete disabledScripts[matchedScriptId];
          }
          scripts[matchedScriptId] = scriptData;
        } else {
          // The script belongs in the disabled list
          if (scriptInActive) {
            // Move the script to the disabled list if it is active
            delete scripts[matchedScriptId];
          }
          disabledScripts[matchedScriptId] = scriptData;
        }
      }
      
      // Save back to storage
      await chrome.storage.local.set({ 
        scripts: scripts,
        _disabledScripts: disabledScripts 
      });
      
      // Stay in edit mode instead of switching to read-only mode
      // Reset the current script object with the updated code
      currentScript = scriptData;
      
      // Show the save success state
      showToast(i18n.t('save_success'), 'success');
      
    } catch (error) {
      console.error('Error saving script:', error);
      showToast(i18n.t('save_failed') + ': ' + error.message, 'error');
    }
  }
  
  // Toggle the script enabled state
  async function toggleScriptEnabled(enabled) {
    isScriptEnabled = enabled;
    
    // Update the status display
    updateStatusDisplay(
      enabled, 
      enabled ? i18n.t('status_injected') : i18n.t('status_disabled')
    );
    
    if (!matchedScriptId || matchedScriptId.startsWith('temp_')) {
      // For a new or unsaved script, update only the UI state
      return;
    }
    
    try {
      // Get all scripts
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      
      if (enabled) {
        // Enable the script and restore it if it exists in _disabledScripts
        const disabledData = await chrome.storage.local.get('_disabledScripts');
        const disabledScripts = disabledData._disabledScripts || {};
        
        if (disabledScripts[matchedScriptId]) {
          // Restore the disabled script
          scripts[matchedScriptId] = disabledScripts[matchedScriptId];
          // Remove it from the disabled list
          delete disabledScripts[matchedScriptId];
          // Save the changes
          await chrome.storage.local.set({ 
            'scripts': scripts,
            '_disabledScripts': disabledScripts
          });
        } else if (scripts[matchedScriptId]) {
          // The script is already active; just mark it as enabled
          scripts[matchedScriptId].enabled = true;
          await chrome.storage.local.set({ 'scripts': scripts });
        }
      } else {
        // Disable the script by moving it to _disabledScripts
        if (scripts[matchedScriptId]) {
          // Get disabled-script storage
          const disabledData = await chrome.storage.local.get('_disabledScripts');
          const disabledScripts = disabledData._disabledScripts || {};
          
          // Save to disabled-script storage
          disabledScripts[matchedScriptId] = scripts[matchedScriptId];
          // Remove it from the active scripts
          delete scripts[matchedScriptId];
          
          // Save the changes
          await chrome.storage.local.set({ 
            'scripts': scripts,
            '_disabledScripts': disabledScripts
          });
        }
      }
      
      // Refresh the page immediately to apply the changes
      refreshPage();
    } catch (error) {
      console.error('Error updating script status:', error);
      showToast(i18n.t('status_update_failed') + ': ' + error.message, 'error');
    }
  }
  
  // Get the current tab
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    if (tabs.length === 0) {
      currentDomainEl.textContent = i18n.t('no_available_tabs');
      updateStatusDisplay(false, i18n.t('load_error'));
      disableSiteButtons(addScriptBtn, editScriptBtn);
      showEmptyState();
      return;
    }
    
    const currentTab = tabs[0];
    currentTabId = currentTab.id;
    currentTabUrl = currentTab.url;
    
    // Check whether the URL is valid
    if (!currentTabUrl || !currentTabUrl.startsWith('http')) {
      currentDomainEl.textContent = i18n.t('not_a_web_page');
      updateStatusDisplay(false, i18n.t('use_script_injection_function'));
      disableSiteButtons(addScriptBtn, editScriptBtn);
      showEmptyState();
      return;
    }
    
    try {
      // Extract the domain from the URL
      const url = new URL(currentTabUrl);
      currentDomain = url.hostname;
      currentDomainEl.textContent = currentDomain;
      
      // Check active scripts first
      const data = await chrome.storage.local.get(['scripts', '_disabledScripts']);
      const scripts = data.scripts || {};
      const disabledScripts = data._disabledScripts || {};
      
      // Find a matching active script
      let exactMatch = false;
      let foundInDisabled = false;
      
      // Search active scripts first
      Object.keys(scripts).forEach(id => {
        const script = scripts[id];
        const scriptDomain = script.domain;
        
        // Check whether this is a wildcard domain, such as *.example.com
        if (scriptDomain.startsWith('*.') && currentDomain.endsWith(scriptDomain.substring(1))) {
          if (!exactMatch) {
            matchedScriptId = id;
            isScriptEnabled = true;
          }
        } 
        // Exact match
        else if (scriptDomain === currentDomain) {
          matchedScriptId = id;
          isScriptEnabled = true;
          exactMatch = true;
        }
      });
      
      // If no active script is found, search disabled scripts
      if (!matchedScriptId) {
        Object.keys(disabledScripts).forEach(id => {
          const script = disabledScripts[id];
          const scriptDomain = script.domain;
          
          // Check whether this is a wildcard domain, such as *.example.com
          if (scriptDomain.startsWith('*.') && currentDomain.endsWith(scriptDomain.substring(1))) {
            if (!exactMatch && !foundInDisabled) {
              matchedScriptId = id;
              isScriptEnabled = false;
              foundInDisabled = true;
            }
          } 
          // Exact match
          else if (scriptDomain === currentDomain) {
            matchedScriptId = id;
            isScriptEnabled = false;
            foundInDisabled = true;
            exactMatch = true;
          }
        });
      }
      
      // Update the UI
      if (matchedScriptId) {
        updateStatusDisplay(
          isScriptEnabled, 
          isScriptEnabled ? i18n.t('status_injected') : i18n.t('status_disabled')
        );
        editScriptBtn.disabled = false;
        addScriptBtn.disabled = false;
        setToggleSwitchState(true); // Enable the switch
        
        // Show the script code regardless of whether it is active or disabled
        const scriptToShow = isScriptEnabled ? 
                            scripts[matchedScriptId] : 
                            disabledScripts[matchedScriptId];
        
        showCode(scriptToShow);
      } else {
        updateStatusDisplay(false, i18n.t('status_not_injected'));
        editScriptBtn.disabled = true;
        addScriptBtn.disabled = false;
        setToggleSwitchState(false); // Disable the switch
        showEmptyState();
      }
      
    } catch (error) {
      console.error('Error processing the current tab:', error);
      currentDomainEl.textContent = i18n.t('error');
      updateStatusDisplay(false, i18n.t('load_error'));
      disableSiteButtons(addScriptBtn, editScriptBtn);
      showEmptyState();
    }
  });
  
  // Add script button
  addScriptBtn.addEventListener('click', function() {
    chrome.tabs.create({url: `editor.html?domain=${encodeURIComponent(currentDomain)}`});
  });
  
  // Edit script button
  editScriptBtn.addEventListener('click', function() {
    if (matchedScriptId) {
      chrome.tabs.create({url: `editor.html?id=${matchedScriptId}`});
    }
  });
  
  // Manage scripts button
  manageScriptsBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'manager.html'});
  });
  
  // Options button
  optionsBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'options.html'});
  });
  
  // Switch control
  toggleInjectionSwitch.addEventListener('change', function() {
    toggleScriptEnabled(this.checked);
  });
  
  // Create a new script
  function createNewScript() {
    // Get the current timestamp
    const currentTime = Date.now();
    
    // Create a new empty script
    currentScript = {
      domain: currentDomain,
      name: i18n.t('script_name') + currentDomain,
      code: '// ' + i18n.t('write_your_javascript_code') + '\n\n\n\n\n\n\n\n\n',
      enabled: true,
      createdAt: currentTime,
      updatedAt: currentTime
    };
    
    // Create a temporary ID
    matchedScriptId = 'temp_' + currentTime;
    
    // Show the editor and enter edit mode
    emptyState.classList.add('hidden');
    codeEditorDiv.style.display = '';
    codeTitle.textContent = currentScript.name;
    scriptNameInput.value = currentScript.name;
    editor.setValue(currentScript.code);
    editor.refresh();
    setEditMode(true);
    
    // Show the save button
    saveScriptBtn.classList.remove('hidden');
    
    // Update the state
    isScriptEnabled = true;
    updateStatusDisplay(true, i18n.t('status_injected'));
  }
  
  // Toggle edit mode
  toggleEditBtn.addEventListener('click', function() {
    if (!currentScript) {
      createNewScript();
      return;
    }
    
    // Always save instead of switching modes
    saveScript();
  });
  
  // Create script button
  if (createScriptBtn) {
    createScriptBtn.addEventListener('click', function() {
      createNewScript();
    });
  }
  
  // Refresh page button
  refreshPageBtn.addEventListener('click', function() {
    refreshPage();
  });
  
  // Save script button
  saveScriptBtn.addEventListener('click', function() {
    saveScript();
  });
  
  // Edit name button
  editNameBtn.addEventListener('click', function() {
    if (!currentScript) return;
    toggleEditName();
  });
  
  // Save the name when Enter is pressed
  scriptNameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      toggleEditName();
    }
  });
  
  // Disable website-specific buttons
  function disableSiteButtons(addButton, editButton) {
    addButton.disabled = true;
    editButton.disabled = true;
    setToggleSwitchState(false); // Disable the toggle switch
  }
  
  // Dark mode toggle button
  toggleThemeBtn.addEventListener('click', function() {
    toggleTheme();
  });
  
  // Wait for i18n initialization
  async function waitForI18nInit() {
    // Return if a language setting already exists
    const result = await chrome.storage.local.get('language');
    if (!result.language) {
      // If no language is stored, wait 100 ms for i18n initialization
      return new Promise(resolve => setTimeout(resolve, 100));
    }
    return Promise.resolve();
  }
  
  // Initialize the language switch button
  function initLangToggle() {
    const langToggle = document.getElementById('lang-toggle');
    
    // Update the language display
    async function updateLangDisplay() {
      // Read the current language directly from storage to get the latest value
      const result = await chrome.storage.local.get('language');
      const currentLang = result.language || 'en';
      
      const langText = currentLang === 'nl' ? i18n.t('language_label_dutch') : i18n.t('language_label_english');
      const langIcon = currentLang === 'nl' ? '🇳🇱' : '🇺🇸';
      langToggle.innerHTML = `<span style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 14px;">${langIcon}</span><span>${langText}</span>
      </span>`;
    }
    
    // Update the language display initially
    updateLangDisplay();
    
    // Language toggle event
    langToggle.addEventListener('click', async () => {
      // Get the current language
      const result = await chrome.storage.local.get('language');
      const currentLang = result.language || 'en';
      
      // Toggle the language
      const newLang = currentLang === 'en' ? 'nl' : 'en';
      
      // Set the new language
      i18n.setLanguage(newLang);
      
      // Update the display
      updateLangDisplay();
      
      // Show a toast
      showToast(newLang === 'en' ? i18n.t('language_switched_to_english') : i18n.t('language_switched_to_dutch'), 'info');
    });
  }
  
  // Toast notification system
  function showToast(message, type = 'info', duration = 2000) {
    // Clear previous toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => {
      if (t.classList.contains('show')) {
        t.classList.remove('show');
        setTimeout(() => {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }
    });
    
    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add it to the container
    toastContainer.appendChild(toast);
    
    // Trigger the animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Dismiss automatically
    setTimeout(() => {
      toast.classList.remove('show');
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
    
    return toast;
  }
}); 