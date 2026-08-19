// Import the i18n module
import { i18n, translator } from './i18n/index.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain') || '';
  const scriptId = urlParams.get('id') || '';
  
  // Get DOM elements
  const domainInput = document.getElementById('domain');
  const nameInput = document.getElementById('name');
  const codeTextarea = document.getElementById('code');
  const codeEditorDiv = document.getElementById('code-editor');
  const saveButton = document.getElementById('save');
  const returnButton = document.getElementById('return');
  const cancelButton = document.getElementById('cancel');
  const deleteButton = document.getElementById('delete');
  const pageTitle = document.getElementById('page-title');
  const formatCodeButton = document.getElementById('format-code');
  const toggleAutocompleteButton = document.getElementById('toggle-autocomplete');
  const toggleThemeButton = document.getElementById('toggle-theme');
  const toastContainer = document.getElementById('toast-container');
  
  // Add the language switch button
  const titleContainer = document.createElement('div');
  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  
  const langToggle = document.createElement('button');
  langToggle.id = 'lang-toggle';
  langToggle.innerHTML = `<span style="display: flex; align-items: center; gap: 4px;">
    <span style="font-size: 18px;">🌐</span><span data-i18n="language">语言</span>
  </span>`;
  langToggle.title = `${i18n.t('language_label_english')} / ${i18n.t('language_label_dutch')}`;
  langToggle.className = 'lang-toggle';
  
  // Replace the original title content with a container
  const titleContent = pageTitle.textContent;
  pageTitle.textContent = '';
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = titleContent;
  titleSpan.setAttribute('data-i18n', scriptId ? 'edit_script' : 'add_script');
  
  titleContainer.appendChild(titleSpan);
  titleContainer.appendChild(langToggle);
  pageTitle.appendChild(titleContainer);
  
  // Dark-mode state
  let isDarkMode = false;
  
  // Declare the editor variable in advance
  let editor = null;
  
  // Initialize the theme
  await initTheme();
  
  // Initialize page translations
  translator.translatePage();
  
  // Listen for clicks on the language switch button
  langToggle.addEventListener('click', toggleLanguage);
  
  // Toggle the language
  function toggleLanguage() {
    // Get the current language
    const currentLang = i18n.getLanguage();
    // Toggle the language
    const newLang = currentLang === 'en' ? 'nl' : 'en';
    // Set the new language
    i18n.setLanguage(newLang);
    // Show a notification
    showToast(newLang === 'en' ? i18n.t('language_switched_to_english') : i18n.t('language_switched_to_dutch'), 'info');
    
    // Update the autocomplete button text
    updateAutocompleteButtonText();
  }
  
  // 初始化主题
  async function initTheme() {
    return new Promise((resolve) => {
      // Get the theme setting from local storage
      chrome.storage.local.get('darkMode', (data) => {
        isDarkMode = data.darkMode === true;
        resolve();
      });
    });
  }
  
  // Apply the theme
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (editor) {
        editor.setOption('theme', 'monokai');
      }
      currentTheme = 'monokai';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (editor) {
        editor.setOption('theme', 'default');
      }
      currentTheme = 'default';
    }
  }
  
  // Initialize the CodeMirror editor
  editor = CodeMirror(codeEditorDiv, {
    value: '',
    mode: 'javascript',
    theme: isDarkMode ? 'monokai' : 'default',
    lineNumbers: true,
    tabSize: 2,
    indentWithTabs: false,
    indentUnit: 2,
    matchBrackets: true,
    autoCloseBrackets: true,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'Tab': function(cm) {
        const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
        cm.replaceSelection(spaces);
      }
    }
  });
  
  // Autocomplete state
  let autocompleteEnabled = true;
  
  // Theme state - keep it synchronized with dark mode
  let currentTheme = isDarkMode ? 'monokai' : 'default';
  
  // Apply the theme now that the editor has been initialized
  applyTheme(isDarkMode);
  
  // 切换主题
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    
    // Save the theme setting
    chrome.storage.local.set({ darkMode: isDarkMode });
    
    // Apply the theme
    applyTheme(isDarkMode);
    
    showToast(isDarkMode ? i18n.t('switched_to_dark_theme') : i18n.t('switched_to_light_theme'), 'info');
  }
  
  // Add event listeners
  toggleThemeButton.addEventListener('click', toggleTheme);
  
  // Toast notification system
  function showToast(message, type = 'info', duration = 3000) {
    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add it to the container
    toastContainer.appendChild(toast);
    
    // Show the animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Hide automatically
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    }, duration);
    
    return toast;
  }
  
  // Toast-based replacement for confirm
  function showConfirmToast(message) {
    return new Promise((resolve) => {
      // Create the toast element
      const toast = document.createElement('div');
      toast.className = 'toast toast-warning';
      
      // Add the message and buttons
      const messageEl = document.createElement('div');
      messageEl.textContent = message;
      messageEl.style.marginBottom = '10px';
      toast.appendChild(messageEl);
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.marginTop = '10px';
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'center';
      buttonContainer.style.gap = '10px';
      
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = i18n.t('confirm');
      confirmBtn.style.padding = '5px 10px';
      confirmBtn.style.border = 'none';
      confirmBtn.style.borderRadius = '3px';
      confirmBtn.style.backgroundColor = '#4caf50';
      confirmBtn.style.color = 'white';
      confirmBtn.style.cursor = 'pointer';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = i18n.t('cancel');
      cancelBtn.style.padding = '5px 10px';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '3px';
      cancelBtn.style.backgroundColor = '#f44336';
      cancelBtn.style.color = 'white';
      cancelBtn.style.cursor = 'pointer';
      
      buttonContainer.appendChild(confirmBtn);
      buttonContainer.appendChild(cancelBtn);
      toast.appendChild(buttonContainer);
      
      // Add it to the container
      toastContainer.appendChild(toast);
      
      // Show the animation
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Button events
      confirmBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
          toastContainer.removeChild(toast);
          resolve(true);
        }, 300);
      });
      
      cancelBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
          toastContainer.removeChild(toast);
          resolve(false);
        }, 300);
      });
    });
  }
  
  // Check for unsaved changes
  async function checkUnsavedChanges() {
    const originalData = await chrome.storage.local.get('scripts');
    const scripts = originalData.scripts || {};
    
    // Determine whether there are unsaved changes
    if (scriptId && scripts[scriptId] && !scripts[scriptId].unsaved) {
      // Get the original script
      const originalScript = scripts[scriptId];
      
      // Compare the input values with the original values
      const hasChanges = 
        domainInput.value !== originalScript.domain || 
        nameInput.value !== originalScript.name || 
        editor.getValue() !== originalScript.code;
      
      if (hasChanges) {
        // Mark the changes as unsaved
        scripts[scriptId].unsaved = true;
        await chrome.storage.local.set({ scripts });
      }
    }
  }
  
  // Format JavaScript code
  function formatJSCode(code) {
    try {
      // Apply basic formatting by normalizing whitespace and indentation
      let formatted = code.replace(/\n{3,}/g, '\n\n'); // Remove extra line breaks
      
      // Add appropriate indentation
      const lines = formatted.split('\n');
      let indentLevel = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Adjust the indentation level
        if (line.match(/[{[]$/)) {
          // This line ends with { or [, so increase indentation for the next line
          lines[i] = '  '.repeat(indentLevel) + line;
          indentLevel++;
        } else if (line.match(/^[}\]]/)) {
          // This line starts with } or ], so reduce indentation
          indentLevel = Math.max(0, indentLevel - 1);
          lines[i] = '  '.repeat(indentLevel) + line;
        } else {
          // Use the current indentation level
          lines[i] = '  '.repeat(indentLevel) + line;
        }
        
        // Check whether the line ends with extra closing braces or brackets
        if (line.match(/^[^}\]]*[}\]]+/)) {
          const rightBraces = (line.match(/[}\]]/g) || []).length;
          const leftBraces = (line.match(/[{[]/g) || []).length;
          
          // Reduce indentation when there are more closing than opening braces
          if (rightBraces > leftBraces) {
            indentLevel = Math.max(0, indentLevel - (rightBraces - leftBraces));
          }
        }
      }
      
      return lines.join('\n');
    } catch (e) {
      console.error('格式化代码时出错:', e);
      showToast(i18n.t('format_error'), 'error');
      return code; // Return the original code
    }
  }
  
  // Format button event
  formatCodeButton.addEventListener('click', () => {
    const currentCode = editor.getValue();
    const formattedCode = formatJSCode(currentCode);
    editor.setValue(formattedCode);
    showToast(i18n.t('code_formatted'), 'success');
  });
  
  // Toggle autocomplete
  function toggleAutocomplete() {
    autocompleteEnabled = !autocompleteEnabled;
    
    const extraKeys = autocompleteEnabled 
      ? {
          'Ctrl-Space': 'autocomplete',
          'Tab': function(cm) {
            const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
            cm.replaceSelection(spaces);
          }
        }
      : {
          'Tab': function(cm) {
            const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
            cm.replaceSelection(spaces);
          }
        };
    
    editor.setOption('extraKeys', extraKeys);
    updateAutocompleteButtonText();
    
    showToast(
      autocompleteEnabled 
        ? i18n.t('autocomplete_enabled')
        : i18n.t('autocomplete_disabled'), 
      'info'
    );
  }
  
  // Update the autocomplete button text
  function updateAutocompleteButtonText() {
    const autoCompleteTextSpan = toggleAutocompleteButton.querySelector('span:last-child');
    if (autoCompleteTextSpan) {
      autoCompleteTextSpan.textContent = autocompleteEnabled 
        ? i18n.t('autocomplete_on')
        : i18n.t('autocomplete_off');
    }
  }
  
  toggleAutocompleteButton.addEventListener('click', toggleAutocomplete);
  
  // Save button event
  saveButton.addEventListener('click', async () => {
    // Get input values
    const domainValue = domainInput.value.trim();
    const nameValue = nameInput.value.trim();
    const codeValue = editor.getValue();
    
    // Validate the input
    if (!domainValue) {
      showToast(i18n.t('domain_required'), 'error');
      domainInput.focus();
      return;
    }
    
    if (!nameValue) {
      showToast(i18n.t('name_required'), 'error');
      nameInput.focus();
      return;
    }
    
    if (!codeValue) {
      showToast(i18n.t('code_required'), 'error');
      editor.focus();
      return;
    }
    
    try {
      // Get the scripts
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      
      // Current time
      const now = Date.now();
      
      if (scriptId) {
        // Update the existing script
        const script = scripts[scriptId];
        if (script) {
          script.domain = domainValue;
          script.name = nameValue;
          script.code = codeValue;
          script.updatedAt = now;
          delete script.unsaved; // Remove the unsaved marker
        }
      } else {
        // Create a new script ID
        const newId = 'script_' + now;
        
        // Add the new script
        scripts[newId] = {
          domain: domainValue,
          name: nameValue,
          code: codeValue,
          createdAt: now,
          updatedAt: now
        };
      }
      
      // Save the script
      await chrome.storage.local.set({ scripts });
      
      showToast(i18n.t('script_saved'), 'success');
      
      // Delay navigation so the user can see the success message
      setTimeout(() => {
        window.location.href = 'manager.html';
      }, 1500);
    } catch (error) {
      console.error('保存脚本时出错:', error);
      showToast(i18n.t('save_error') + ': ' + error.message, 'error');
    }
  });
  
  // Cancel button event
  cancelButton.addEventListener('click', async () => {
    // When editing an existing script, check for unsaved changes
    if (scriptId) {
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      const script = scripts[scriptId];
      
      if (script && script.unsaved) {
        // Ask the user when there are unsaved changes
        const confirmed = await showConfirmToast(i18n.t('unsaved_changes'));
        if (!confirmed) return;
        
        // Remove the unsaved marker
        delete script.unsaved;
        await chrome.storage.local.set({ scripts });
      }
    }
    
    // Return to the manager page
    window.location.href = 'manager.html';
  });
  
  // Return button event
  returnButton.addEventListener('click', async () => {
    // When editing an existing script, check for unsaved changes
    if (scriptId) {
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      const script = scripts[scriptId];
      
      if (script && script.unsaved) {
        // Ask the user when there are unsaved changes
        const confirmed = await showConfirmToast(i18n.t('unsaved_changes'));
        if (!confirmed) return;
        
        // Remove the unsaved marker
        delete script.unsaved;
        await chrome.storage.local.set({ scripts });
      }
    }
    
    // Return to the manager page
    window.location.href = 'manager.html';
  });
  
  // Delete button event
  deleteButton.addEventListener('click', async () => {
    // Confirm deletion
    const confirmed = await showConfirmToast(i18n.t('confirm_delete'));
    
    if (confirmed) {
      try {
        // Get the scripts
        const data = await chrome.storage.local.get('scripts');
        const scripts = data.scripts || {};
        
        // Delete the script
        if (scripts[scriptId]) {
          delete scripts[scriptId];
          await chrome.storage.local.set({ scripts });
          
          showToast(i18n.t('script_deleted'), 'success');
          
          // Delay navigation so the user can see the success message
          setTimeout(() => {
            window.location.href = 'manager.html';
          }, 1500);
        }
      } catch (error) {
        console.error('删除脚本时出错:', error);
        showToast(i18n.t('delete_error') + ': ' + error.message, 'error');
      }
    }
  });
  
  // Automatically fill the form when a domain or script ID is provided
  if (domain) {
    domainInput.value = domain;
  }
  
  if (scriptId) {
    // Load the script and fill the form
    try {
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      const script = scripts[scriptId];
      
      if (script) {
        // Update the page title
        if (titleSpan) {
          titleSpan.textContent = i18n.t('edit_script');
          titleSpan.setAttribute('data-i18n', 'edit_script');
        } else {
          pageTitle.textContent = i18n.t('edit_script');
          pageTitle.setAttribute('data-i18n', 'edit_script');
        }
        
        // Fill the form
        domainInput.value = script.domain;
        nameInput.value = script.name;
        editor.setValue(script.code || '');
        
        // Show the delete button
        deleteButton.style.display = 'flex';
      }
    } catch (error) {
      console.error('加载脚本时出错:', error);
      showToast(i18n.t('load_script_error') + ': ' + error.message, 'error');
    }
  }
  
  // Listen for input changes and mark unsaved changes
  domainInput.addEventListener('input', checkUnsavedChanges);
  nameInput.addEventListener('input', checkUnsavedChanges);
  editor.on('change', checkUnsavedChanges);
  
  // Set up autocomplete
  updateAutocompleteButtonText();
});