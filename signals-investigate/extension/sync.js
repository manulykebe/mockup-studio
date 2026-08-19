import i18n from './i18n/i18n.js';

const t = (key) => i18n.t(key);

/**
 * Data synchronization module
 * Synchronizes script data between different devices
 */

let autoSyncEnabled = true;
let syncIntervalId = null;
const DEFAULT_SYNC_INTERVAL = 10 * 60 * 1000;

async function initSync() {
  console.log(t('sync_initializing'));

  const settings = await getSyncSettings();
  autoSyncEnabled = settings.autoSync;

  if (autoSyncEnabled) {
    startAutoSync(settings.syncInterval);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSyncSettings') {
      handleSyncSettingsUpdate(message.settings);
      sendResponse({ success: true });
    } else if (message.action === 'syncNow') {
      syncData()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    } else if (message.action === 'getSyncStatus') {
      getSyncStatus()
        .then(status => sendResponse({ success: true, status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });

  if (autoSyncEnabled) {
    setTimeout(() => syncData(), 5000);
  }
}

function handleSyncSettingsUpdate(settings) {
  console.log(t('sync_settings_updated'), settings);
  autoSyncEnabled = settings.autoSync;

  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (autoSyncEnabled) {
    startAutoSync(settings.syncInterval);
  }
}

function startAutoSync(interval = DEFAULT_SYNC_INTERVAL) {
  const syncInterval = Math.max(interval, 60000);
  console.log(`${t('sync_interval_set')} ${syncInterval}ms`);

  syncIntervalId = setInterval(() => {
    syncData().catch(error => {
      console.error(t('automatic_sync_failed'), error);
    });
  }, syncInterval);
}

async function getSyncSettings() {
  const data = await chrome.storage.local.get(['syncSettings']);
  const defaultSettings = {
    autoSync: true,
    syncInterval: DEFAULT_SYNC_INTERVAL,
    syncProvider: 'chrome',
    lastSyncTime: 0
  };

  return data.syncSettings || defaultSettings;
}

async function saveSyncSettings(settings) {
  return chrome.storage.local.set({
    syncSettings: {
      ...await getSyncSettings(),
      ...settings
    }
  });
}

async function getSyncStatus() {
  const settings = await getSyncSettings();
  const now = Date.now();

  return {
    autoSyncEnabled,
    lastSyncTime: settings.lastSyncTime,
    nextSyncTime: autoSyncEnabled ? settings.lastSyncTime + settings.syncInterval : null,
    timeUntilNextSync: autoSyncEnabled ? Math.max(0, settings.lastSyncTime + settings.syncInterval - now) : null,
    syncProvider: settings.syncProvider
  };
}

async function syncData() {
  console.log(t('sync_in_progress'));

  try {
    const settings = await getSyncSettings();
    const provider = settings.syncProvider;
    let result;

    if (provider === 'chrome') {
      result = await syncWithChromeSync();
    } else {
      throw new Error(`${t('unsupported_sync_provider')} ${provider}`);
    }

    await saveSyncSettings({ lastSyncTime: Date.now() });
    console.log(t('sync_succeeded'), result);
    return result;
  } catch (error) {
    console.error(t('sync_failed'), error);
    throw error;
  }
}

async function syncWithChromeSync() {
  const localData = await chrome.storage.local.get(['scripts', 'disabled_scripts']);
  const cloudData = await chrome.storage.sync.get(['scripts', 'disabled_scripts', 'lastSyncTimestamp']);
  const localTimestamp = (await chrome.storage.local.get(['lastSyncTimestamp'])).lastSyncTimestamp || 0;
  const cloudTimestamp = cloudData.lastSyncTimestamp || 0;
  const mergeResult = {
    direction: null,
    changes: { scripts: 0, disabled_scripts: 0 }
  };

  let mergedScripts = {};
  let mergedDisabledScripts = [];

  if (cloudTimestamp > localTimestamp) {
    console.log(t('cloud_to_local_sync'));
    mergeResult.direction = 'cloud_to_local';
    mergedScripts = { ...(localData.scripts || {}), ...(cloudData.scripts || {}) };

    const localDisabled = new Set(localData.disabled_scripts || []);
    const cloudDisabled = new Set(cloudData.disabled_scripts || []);
    mergedDisabledScripts = [...new Set([...localDisabled, ...cloudDisabled])];
    mergeResult.changes.scripts = Object.keys(cloudData.scripts || {}).length;
    mergeResult.changes.disabled_scripts = cloudData.disabled_scripts ? cloudData.disabled_scripts.length : 0;

    await chrome.storage.local.set({
      scripts: mergedScripts,
      disabled_scripts: mergedDisabledScripts,
      lastSyncTimestamp: Date.now()
    });
  } else {
    console.log(t('local_to_cloud_sync'));
    mergeResult.direction = 'local_to_cloud';
    mergedScripts = localData.scripts || {};
    mergedDisabledScripts = localData.disabled_scripts || [];
    mergeResult.changes.scripts = Object.keys(mergedScripts).length;
    mergeResult.changes.disabled_scripts = mergedDisabledScripts.length;

    try {
      const dataStr = JSON.stringify({
        scripts: mergedScripts,
        disabled_scripts: mergedDisabledScripts
      });

      if (dataStr.length > 100000) {
        console.warn(t('sync_data_too_large'));
        await chrome.storage.sync.set({
          disabled_scripts: mergedDisabledScripts,
          lastSyncTimestamp: Date.now()
        });
        mergeResult.dataTooLarge = true;
      } else {
        await chrome.storage.sync.set({
          scripts: mergedScripts,
          disabled_scripts: mergedDisabledScripts,
          lastSyncTimestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(t('sync_save_failed'), error);
      if (error.message.includes('QUOTA_BYTES')) {
        console.warn(t('sync_quota_fallback'));
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

globalThis.JsInjectorSync = {
  init: initSync,
  syncNow: syncData,
  getStatus: getSyncStatus,
  getSettings: getSyncSettings,
  saveSettings: saveSyncSettings
};
