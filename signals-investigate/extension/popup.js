// 导入i18n模块
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
  
  // 代码编辑器相关元素
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
  
  // 获取当前标签页的URL
  let currentDomain = '';
  let currentTabId = null;
  let currentTabUrl = '';
  let matchedScriptId = null;
  let currentScript = null;
  let isEditMode = true; // 默认为编辑模式
  let isEditingName = false;
  let isScriptEnabled = false;
  let isDarkMode = false; // Dark mode state
  let editor = null; // 将编辑器变量提升到顶层作用域
  
  // Initialize the theme
  initTheme();
  
  // Initialize the UI in edit mode
  // Change the edit button to a save icon
  toggleEditBtn.innerHTML = '<span>✓</span>';
  toggleEditBtn.title = i18n.t('save_edit');
  
  // 更新状态文本
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
      
      // 更新切换按钮状态
      if (toggleThemeBtn) {
        toggleThemeBtn.innerHTML = isDarkMode ? '<span>☀️</span>' : '<span>🌙</span>';
        toggleThemeBtn.title = isDarkMode ? i18n.t('light_theme_title') : i18n.t('dark_theme_title');
      }
    });
  }
  
  // 应用主题
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (editor) {
        editor.setOption('theme', 'monokai'); // 暗色主题
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (editor) {
        editor.setOption('theme', 'default'); // 亮色主题
      }
    }
  }
  
  // 切换主题
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    
    // 应用主题
    applyTheme(isDarkMode);
    
    // 更新切换按钮状态
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
    readOnly: false, // 默认为可编辑模式，不再是只读
    lineWrapping: false, // 不换行，保持代码整洁
    scrollbarStyle: 'native', // 使用原生滚动条样式
    viewportMargin: Infinity, // 允许视口外的内容渲染
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'Tab': function(cm) {
        const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
        cm.replaceSelection(spaces);
      }
    }
  });
  
  // 更新状态显示
  function updateStatusDisplay(isActive, statusText) {
    // 更新文本内容，保留状态指示器
    const statusIndicator = scriptStatusEl.querySelector('.status-indicator');
    
    // 从状态文本中移除"状态: "前缀
    const displayText = statusText.replace('Status: ', '');
    scriptStatusEl.textContent = displayText;
    scriptStatusEl.insertAdjacentElement('afterbegin', statusIndicator);
    
    // 更新状态类
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
  
  // 启用或禁用切换开关
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
  
  // 显示代码
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
  
  // 显示空状态
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
      
      // 延迟关闭popup窗口
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error('Error refreshing page:', error);
      showToast(i18n.t('refresh_failed') + ': ' + error.message, 'error');
    }
  }
  
  // 切换编辑名称
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
      
      // 获取当前所有脚本和禁用脚本
      const data = await chrome.storage.local.get(['scripts', '_disabledScripts']);
      const scripts = data.scripts || {};
      const disabledScripts = data._disabledScripts || {};
      
      // 检查是否是新脚本（临时ID）
      const isNewScript = matchedScriptId.startsWith('temp_');
      
      // 获取当前时间
      const currentTime = Date.now();
      
      // 准备脚本数据
      const scriptData = {
        domain: currentDomain,
        name: currentScript.name,
        code: editor.getValue(),
        createdAt: currentScript.createdAt || currentTime,
        updatedAt: currentTime
      };
      
      if (isNewScript) {
        // 为新脚本创建一个真实的ID
        const realId = 'script_' + currentTime;
        matchedScriptId = realId;
        
        // 根据启用状态决定存储位置
        if (isScriptEnabled) {
          scripts[realId] = scriptData;
        } else {
          disabledScripts[realId] = scriptData;
        }
        
        // 更新状态
        updateStatusDisplay(isScriptEnabled, isScriptEnabled ? i18n.t('status_injected') : i18n.t('status_disabled'));
        editScriptBtn.disabled = false;
      } else {
        // 更新现有脚本 - 首先确定脚本在哪个存储中
        const scriptInActive = scripts[matchedScriptId] !== undefined;
        const scriptInDisabled = disabledScripts[matchedScriptId] !== undefined;
        
        // 保留原始创建时间
        if (scriptInActive && scripts[matchedScriptId].createdAt) {
          scriptData.createdAt = scripts[matchedScriptId].createdAt;
        } else if (scriptInDisabled && disabledScripts[matchedScriptId].createdAt) {
          scriptData.createdAt = disabledScripts[matchedScriptId].createdAt;
        }
        
        if (isScriptEnabled) {
          // The script belongs in the active list
          if (scriptInDisabled) {
            // 如果脚本在禁用列表中，移动到激活列表
            delete disabledScripts[matchedScriptId];
          }
          scripts[matchedScriptId] = scriptData;
        } else {
          // The script belongs in the disabled list
          if (scriptInActive) {
            // 如果脚本在激活列表中，移动到禁用列表
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
  
  // 切换脚本启用状态
  async function toggleScriptEnabled(enabled) {
    isScriptEnabled = enabled;
    
    // 更新状态显示
    updateStatusDisplay(
      enabled, 
      enabled ? i18n.t('status_injected') : i18n.t('status_disabled')
    );
    
    if (!matchedScriptId || matchedScriptId.startsWith('temp_')) {
      // For a new or unsaved script, update only the UI state
      return;
    }
    
    try {
      // 获取当前所有脚本
      const data = await chrome.storage.local.get('scripts');
      const scripts = data.scripts || {};
      
      if (enabled) {
        // 启用脚本 - 如果存在于_disabledScripts中，则恢复
        const disabledData = await chrome.storage.local.get('_disabledScripts');
        const disabledScripts = disabledData._disabledScripts || {};
        
        if (disabledScripts[matchedScriptId]) {
          // 恢复被禁用的脚本
          scripts[matchedScriptId] = disabledScripts[matchedScriptId];
          // 从禁用列表中移除
          delete disabledScripts[matchedScriptId];
          // Save the changes
          await chrome.storage.local.set({ 
            'scripts': scripts,
            '_disabledScripts': disabledScripts
          });
        } else if (scripts[matchedScriptId]) {
          // 脚本已经在启用列表中，只需标记为启用
          scripts[matchedScriptId].enabled = true;
          await chrome.storage.local.set({ 'scripts': scripts });
        }
      } else {
        // 禁用脚本 - 移动到_disabledScripts中
        if (scripts[matchedScriptId]) {
          // Get disabled-script storage
          const disabledData = await chrome.storage.local.get('_disabledScripts');
          const disabledScripts = disabledData._disabledScripts || {};
          
          // Save to disabled-script storage
          disabledScripts[matchedScriptId] = scripts[matchedScriptId];
          // 从active scripts中移除
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
  
  // 获取当前标签
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
    
    // 检查URL是否有效
    if (!currentTabUrl || !currentTabUrl.startsWith('http')) {
      currentDomainEl.textContent = i18n.t('not_a_web_page');
      updateStatusDisplay(false, i18n.t('use_script_injection_function'));
      disableSiteButtons(addScriptBtn, editScriptBtn);
      showEmptyState();
      return;
    }
    
    try {
      // 从URL中提取域名
      const url = new URL(currentTabUrl);
      currentDomain = url.hostname;
      currentDomainEl.textContent = currentDomain;
      
      // 先检查活动脚本
      const data = await chrome.storage.local.get(['scripts', '_disabledScripts']);
      const scripts = data.scripts || {};
      const disabledScripts = data._disabledScripts || {};
      
      // 查找匹配的活动脚本
      let exactMatch = false;
      let foundInDisabled = false;
      
      // 首先在活动脚本中查找
      Object.keys(scripts).forEach(id => {
        const script = scripts[id];
        const scriptDomain = script.domain;
        
        // 检查是否是通配符域名（例如 *.example.com）
        if (scriptDomain.startsWith('*.') && currentDomain.endsWith(scriptDomain.substring(1))) {
          if (!exactMatch) {
            matchedScriptId = id;
            isScriptEnabled = true;
          }
        } 
        // 精确匹配
        else if (scriptDomain === currentDomain) {
          matchedScriptId = id;
          isScriptEnabled = true;
          exactMatch = true;
        }
      });
      
      // 如果在活动脚本中未找到，则在禁用脚本中查找
      if (!matchedScriptId) {
        Object.keys(disabledScripts).forEach(id => {
          const script = disabledScripts[id];
          const scriptDomain = script.domain;
          
          // 检查是否是通配符域名（例如 *.example.com）
          if (scriptDomain.startsWith('*.') && currentDomain.endsWith(scriptDomain.substring(1))) {
            if (!exactMatch && !foundInDisabled) {
              matchedScriptId = id;
              isScriptEnabled = false;
              foundInDisabled = true;
            }
          } 
          // 精确匹配
          else if (scriptDomain === currentDomain) {
            matchedScriptId = id;
            isScriptEnabled = false;
            foundInDisabled = true;
            exactMatch = true;
          }
        });
      }
      
      // 更新UI
      if (matchedScriptId) {
        updateStatusDisplay(
          isScriptEnabled, 
          isScriptEnabled ? i18n.t('status_injected') : i18n.t('status_disabled')
        );
        editScriptBtn.disabled = false;
        addScriptBtn.disabled = false;
        setToggleSwitchState(true); // 启用开关
        
        // 显示脚本代码 - 无论是活动脚本还是禁用脚本
        const scriptToShow = isScriptEnabled ? 
                            scripts[matchedScriptId] : 
                            disabledScripts[matchedScriptId];
        
        showCode(scriptToShow);
      } else {
        updateStatusDisplay(false, i18n.t('status_not_injected'));
        editScriptBtn.disabled = true;
        addScriptBtn.disabled = false;
        setToggleSwitchState(false); // 禁用开关
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
  
  // 编辑脚本按钮
  editScriptBtn.addEventListener('click', function() {
    if (matchedScriptId) {
      chrome.tabs.create({url: `editor.html?id=${matchedScriptId}`});
    }
  });
  
  // 管理脚本按钮
  manageScriptsBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'manager.html'});
  });
  
  // Options button
  optionsBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'options.html'});
  });
  
  // 开关控制
  toggleInjectionSwitch.addEventListener('change', function() {
    toggleScriptEnabled(this.checked);
  });
  
  // 创建新脚本
  function createNewScript() {
    // 获取当前时间戳
    const currentTime = Date.now();
    
    // 创建一个新的空脚本
    currentScript = {
      domain: currentDomain,
      name: i18n.t('script_name') + currentDomain,
      code: '// ' + i18n.t('write_your_javascript_code') + '\n\n\n\n\n\n\n\n\n',
      enabled: true,
      createdAt: currentTime,
      updatedAt: currentTime
    };
    
    // 创建一个临时ID
    matchedScriptId = 'temp_' + currentTime;
    
    // 显示编辑器并进入编辑模式
    emptyState.classList.add('hidden');
    codeEditorDiv.style.display = '';
    codeTitle.textContent = currentScript.name;
    scriptNameInput.value = currentScript.name;
    editor.setValue(currentScript.code);
    editor.refresh();
    setEditMode(true);
    
    // Show the save button
    saveScriptBtn.classList.remove('hidden');
    
    // 更新状态
    isScriptEnabled = true;
    updateStatusDisplay(true, i18n.t('status_injected'));
  }
  
  // 切换编辑模式
  toggleEditBtn.addEventListener('click', function() {
    if (!currentScript) {
      createNewScript();
      return;
    }
    
    // Always save instead of switching modes
    saveScript();
  });
  
  // 创建脚本按钮
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
  
  // 编辑名称按钮
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
  
  // 禁用特定于网站的按钮
  function disableSiteButtons(addButton, editButton) {
    addButton.disabled = true;
    editButton.disabled = true;
    setToggleSwitchState(false); // 禁用切换开关
  }
  
  // Dark mode toggle button
  toggleThemeBtn.addEventListener('click', function() {
    toggleTheme();
  });
  
  // Wait for i18n initialization
  async function waitForI18nInit() {
    // 如果已经有language存储，直接返回
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
    
    // 更新语言显示
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
    
    // 初始更新语言显示
    updateLangDisplay();
    
    // 切换语言事件
    langToggle.addEventListener('click', async () => {
      // 获取当前语言
      const result = await chrome.storage.local.get('language');
      const currentLang = result.language || 'en';
      
      // 切换语言
      const newLang = currentLang === 'en' ? 'nl' : 'en';
      
      // Set the new language
      i18n.setLanguage(newLang);
      
      // 更新显示
      updateLangDisplay();
      
      // 显示提示
      showToast(newLang === 'en' ? i18n.t('language_switched_to_english') : i18n.t('language_switched_to_dutch'), 'info');
    });
  }
  
  // Toast通知系统
  function showToast(message, type = 'info', duration = 2000) {
    // 清除之前的toast
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => {
      if (t.classList.contains('show')) {
        t.classList.remove('show');
        setTimeout(() => {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }
    });
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加到容器
    toastContainer.appendChild(toast);
    
    // 触发动画
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // 自动消失
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