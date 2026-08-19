/**
 * JS injector - generic injection script
 * 
 * This script is loaded through web_accessible_resources to execute custom JavaScript in a page.
 */

const scriptParams = new URLSearchParams(new URL(document.currentScript.src).search);
const successMessage = scriptParams.get('success') || 'Script execution succeeded';
const errorMessage = scriptParams.get('error') || 'Script execution failed';
const loadedMessage = scriptParams.get('loaded') || 'Injection core script loaded';

// Global namespace to avoid polluting the page environment
window._JSInjector = window._JSInjector || {
  // Unique ID to avoid collisions
  id: 'js-injector-' + Date.now(),
  
  // Version information
  version: '1.0',
  
  // Execution history
  executedScripts: [],
  
  // Created Blob URLs (release them when no longer needed)
  blobUrls: [],
  
  // Execute through a Blob URL to avoid inline scripts and eval
  executeViaBlob: function(code, scriptName) {
    try {
      // Create a wrapped script Blob
      const wrappedCode = `
        try {
          ${code}
          console.log('[JS Injector] "${scriptName || 'Unnamed script'}" ${successMessage}');
        } catch(err) {
          console.error('[JS Injector] "${scriptName || 'Unnamed script'}" ${errorMessage}:', err);
        }
      `;
      
      // Create the Blob object
      const blob = new Blob([wrappedCode], { type: 'application/javascript' });
      
      // Create the Blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Store the URL for later cleanup
      this.blobUrls.push(blobUrl);
      
      // Create a script element with the Blob URL as its source
      const script = document.createElement('script');
      script.src = blobUrl;
      script.setAttribute('data-js-injector', this.id);
      script.setAttribute('data-script-name', scriptName || 'unnamed-script');
      
      // Add it to the document for execution
      document.head.appendChild(script);
      
      // Record execution details
      this.executedScripts.push({
        name: scriptName || 'unnamed-script',
        timestamp: Date.now(),
        success: true,
        method: 'blob-url'
      });
      
      return true;
    } catch (error) {
      console.error('[JS Injector] ${errorMessage}:', error);
      
      this.executedScripts.push({
        name: scriptName || 'unnamed-script',
        timestamp: Date.now(),
        success: false,
        error: error.message,
        method: 'blob-url'
      });
      
      return false;
    }
  },
  
  // Release all created Blob URLs
  releaseBlobs: function() {
    this.blobUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('[JS Injector] Failed to release Blob URL:', e);
      }
    });
    this.blobUrls = [];
  },
  
  // Main injection function
  injectScript: function(code, scriptName) {
    // Inject using the Blob URL method
    return this.executeViaBlob(code, scriptName);
  },
  
  // Clean up resources when the page unloads
  cleanup: function() {
    this.releaseBlobs();
  }
};

// Clean up resources when the page unloads
window.addEventListener('beforeunload', function() {
  if (window._JSInjector) {
    window._JSInjector.cleanup();
  }
});

console.log(`[JS Injector] ${loadedMessage}, version:`, window._JSInjector.version);