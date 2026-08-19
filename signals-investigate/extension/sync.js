/**
 * Data synchronization module
 * Synchronizes script data between different devices
 */

// Global variables controlling automatic synchronization
let autoSyncEnabled = true;
let syncIntervalId = null;
let lastSyncTime = 0;
const DEFAULT_SYNC_INTERVAL = 10 * 60 * 1000; // Synchronize every 10 minutes by default

// Initialize the synchronization module
async function initSync() {
  console.log('初始化同步模块...');
  
  // Get synchronization settings
  const settings = await getSyncSettings();
  autoSyncEnabled = settings.autoSync;
  
  // Set a timer if automatic synchronization is enabled
  if (autoSyncEnabled) {
    startAutoSync(settings.syncInterval);
  }
  
  // Listen for setting changes from the options page
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSyncSettings') {
      handleSyncSettingsUpdate(message.settings);
      sendResponse({success: true});
    } else if (message.action === 'syncNow') {
      syncData()
        .then(result => sendResponse({success: true, result}))
        .catch(error => sendResponse({success: false, error: error.message}));
      return true; // Indicates an asynchronous response
    } else if (message.action === 'getSyncStatus') {
      getSyncStatus()
        .then(status => sendResponse({success: true, status}))
        .catch(error => sendResponse({success: false, error: error.message}));
      return true; // Indicates an asynchronous response
    }
  });
  
  // Synchronize once on the first run
  if (autoSyncEnabled) {
    setTimeout(() => syncData(), 5000);
  }
}

// Handle synchronization setting updates
function handleSyncSettingsUpdate(settings) {
  console.log('同步设置已更新:', settings);
  autoSyncEnabled = settings.autoSync;
  
  // Stop the existing synchronization timer
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  
  // Restart the timer if automatic synchronization is enabled
  if (autoSyncEnabled) {
    startAutoSync(settings.syncInterval);
  }
}

// Start automatic synchronization
function startAutoSync(interval = DEFAULT_SYNC_INTERVAL) {
  // Ensure the interval is reasonable
  const syncInterval = Math.max(interval, 60000); // Minimum: 1 minute
  
  console.log(`设置自动同步，间隔: ${syncInterval}毫秒`);
  
  syncIntervalId = setInterval(() => {
    syncData().catch(error => {
      console.error('自动同步出错:', error);
    });
  }, syncInterval);
}

// Get synchronization settings
async function getSyncSettings() {
  const data = await chrome.storage.local.get(['syncSettings']);
  const defaultSettings = {
    autoSync: true,
    syncInterval: DEFAULT_SYNC_INTERVAL,
    syncProvider: 'chrome', // Use Chrome Sync by default
    lastSyncTime: 0
  };
  
  return data.syncSettings || defaultSettings;
}

// Save synchronization settings
async function saveSyncSettings(settings) {
  return chrome.storage.local.set({
    syncSettings: {
      ...await getSyncSettings(),
      ...settings
    }
  });
}

// Get synchronization status
async function getSyncStatus() {
  const settings = await getSyncSettings();
  const now = Date.now();
  
  return {
    autoSyncEnabled: autoSyncEnabled,
    lastSyncTime: settings.lastSyncTime,
    nextSyncTime: autoSyncEnabled ? (settings.lastSyncTime + settings.syncInterval) : null,
    timeUntilNextSync: autoSyncEnabled ? Math.max(0, (settings.lastSyncTime + settings.syncInterval) - now) : null,
    syncProvider: settings.syncProvider
  };
}

// Synchronize data
async function syncData() {
  console.log('开始数据同步...');
  
  try {
    const settings = await getSyncSettings();
    const provider = settings.syncProvider;
    
    let result;
    if (provider === 'chrome') {
      result = await syncWithChromeSync();
    } else {
      throw new Error(`不支持的同步提供商: ${provider}`);
    }
    
    // Update the last synchronization time
    await saveSyncSettings({
      lastSyncTime: Date.now()
    });
    
    console.log('数据同步完成:', result);
    return result;
  } catch (error) {
    console.error('数据同步失败:', error);
    throw error;
  }
}

// Synchronize using Chrome Sync storage
async function syncWithChromeSync() {
  // 1. Get data from local storage
  const localData = await chrome.storage.local.get(['scripts', 'disabled_scripts']);
  
  // 2. Get data from the cloud
  const cloudData = await chrome.storage.sync.get(['scripts', 'disabled_scripts', 'lastSyncTimestamp']);
  
  // 3. Compare cloud and local timestamps to determine the synchronization direction
  const localTimestamp = (await chrome.storage.local.get(['lastSyncTimestamp'])).lastSyncTimestamp || 0;
  const cloudTimestamp = cloudData.lastSyncTimestamp || 0;
  
  const mergeResult = {
    direction: null,
    changes: {
      scripts: 0,
      disabled_scripts: 0
    }
  };
  
  // Initialize the merged data
  let mergedScripts = {};
  let mergedDisabledScripts = [];
  
  // 4. Merge the data
  if (cloudTimestamp > localTimestamp) {
    console.log('云端数据更新，从云端同步到本地');
    mergeResult.direction = 'cloud_to_local';
    
    // Merge cloud scripts into local storage
    mergedScripts = {...(localData.scripts || {}), ...(cloudData.scripts || {})};
    
    // Merge the disabled script lists
    const localDisabled = new Set(localData.disabled_scripts || []);
    const cloudDisabled = new Set(cloudData.disabled_scripts || []);
    mergedDisabledScripts = [...new Set([...localDisabled, ...cloudDisabled])];
    
    // Calculate the number of changes
    mergeResult.changes.scripts = Object.keys(cloudData.scripts || {}).length;
    mergeResult.changes.disabled_scripts = cloudData.disabled_scripts ? cloudData.disabled_scripts.length : 0;
    
    // Save to local storage
    await chrome.storage.local.set({
      scripts: mergedScripts,
      disabled_scripts: mergedDisabledScripts,
      lastSyncTimestamp: Date.now()
    });
  } else {
    console.log('本地数据更新或首次同步，从本地同步到云端');
    mergeResult.direction = 'local_to_cloud';
    
    // Merge local scripts into the cloud
    mergedScripts = localData.scripts || {};
    mergedDisabledScripts = localData.disabled_scripts || [];
    
    // Calculate the number of changes
    mergeResult.changes.scripts = Object.keys(mergedScripts).length;
    mergeResult.changes.disabled_scripts = mergedDisabledScripts.length;
    
    // Save to the cloud - note that Chrome Sync has a storage limit
    try {
      // Calculate the data size
      const dataStr = JSON.stringify({
        scripts: mergedScripts,
        disabled_scripts: mergedDisabledScripts
      });
      
      if (dataStr.length > 100000) { // Approximately 100 KB; Chrome Sync is limited to 102 KB
        // If the data is too large, split it into chunks or notify the user
        console.warn('数据过大，超出Chrome存储同步限制，只同步禁用脚本列表');
        // At least synchronize the disabled script list, which is usually small
        await chrome.storage.sync.set({
          disabled_scripts: mergedDisabledScripts,
          lastSyncTimestamp: Date.now()
        });
        mergeResult.dataTooLarge = true;
      } else {
        // The data is within the limit, so synchronize everything
        await chrome.storage.sync.set({
          scripts: mergedScripts,
          disabled_scripts: mergedDisabledScripts,
          lastSyncTimestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('保存到Chrome同步存储失败:', error);
      // If this is a QUOTA_BYTES limit error, try synchronizing only the disabled script list
      if (error.message.includes('QUOTA_BYTES')) {
        await chrome.storage.sync.set({
          disabled_scripts: mergedDisabledScripts,
          lastSyncTimestamp: Date.now()
        });
        mergeResult.dataTooLarge = true;
      } else {
        throw error;
      }
    }
  }
  
  return mergeResult;
}

// Export the module
window.JsInjectorSync = {
  init: initSync,
  syncNow: syncData,
  getStatus: getSyncStatus,
  getSettings: getSyncSettings,
  saveSettings: saveSyncSettings
}; 