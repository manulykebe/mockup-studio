/**
 * JS injector - script executor
 * 
 * This file can be loaded by URL to avoid inline-script CSP restrictions.
 * Parameters are passed through URL query parameters.
 */

(function() {
  // Get parameters from the URL
  const getScriptParams = () => {
    const params = new URLSearchParams(new URL(document.currentScript.src).search);
    return {
      id: params.get('id') || '',
      name: params.get('name') || 'Unnamed script',
      successMessage: params.get('success') || 'Script execution succeeded',
      errorMessage: params.get('error') || 'Script execution failed',
      loadedMessage: params.get('loaded') || 'Executor script loaded'
    };
  };

  const scriptParams = getScriptParams();

  // Log execution details to the console
  const logExecution = (name, success, error) => {
    if (success) {
      // console.log(`"${name}" ${scriptParams.successMessage}`);
    } else {
      console.error(`"${name}" ${scriptParams.errorMessage}:`, error);
    }
  };

  // Listen for messages containing code to execute
  const messageHandler = function(event) {
    // Ensure the message comes from this window
    if (event.source !== window) return;

    // Verify that the message is from the JS injector and targets this executor instance
    if (event.data && event.data.type === 'js-injector-execute' && event.data.id === scriptParams.id) {
      // Each executor instance executes exactly one script
      window.removeEventListener('message', messageHandler);

      try {
        const { code, name, id } = event.data;
        
        // Execute the code immediately
        (new Function(code))();
        
        // Log successful execution
        logExecution(name, true);
        
        // Notify the caller that execution is complete
        window.postMessage({
          type: 'js-injector-executed',
          id: id,
          success: true
        }, '*');
      } catch (error) {
        // Log the execution error
        logExecution(event.data.name, false, error);
        
        // Notify the caller about the execution error
        window.postMessage({
          type: 'js-injector-executed',
          id: event.data.id,
          success: false,
          error: error.message
        }, '*');
      }
    }
  };

  window.addEventListener('message', messageHandler);
  
  // Notify the caller when the script is ready
  if (scriptParams.id) {
    window.postMessage({
      type: 'js-injector-ready',
      id: scriptParams.id
    }, '*');
  }
  
  // console.log(`${scriptParams.loadedMessage}`);
})(); 