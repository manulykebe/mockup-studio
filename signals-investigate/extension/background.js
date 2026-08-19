import i18n from './i18n/i18n.js';

const t = (key) => i18n.t(key);

const injectionSuccessMessage = () => t('injection_succeeded');
const injectionFailureAlert = () => t('primary_injection_failed');
const secondaryInjectFailureAlert = () => t('secondary_injection_failed');
const tertiaryInjectSuccessMessage = () => t('tertiary_injection_succeeded');
const tertiaryInjectFailureAlert = () => t('tertiary_injection_failed');
const strictCSPInjectMessage = () => t('strict_csp_injection');
const allInjectFailureAlert = () => t('all_injection_methods_failed');
const secondaryInjectSuccessMessage = () => t('secondary_injection_succeeded');

const defaultScriptName = () => t('unnamed_script');
const skipDisabledScriptMessage = () => t('skip_disabled_script');
const signalsGateHost = 'revvitycloud.eu';
const signalsGatePath = 'snippets/executeWhenSignalsIsLoaded.js';
const activeInjectionUrls = new Map();
// Listen for tab update events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'loading') {
		activeInjectionUrls.delete(tabId);
		return;
	}

	// When the page has finished loading
	if (changeInfo.status === 'complete' && tab.url) {
		if (activeInjectionUrls.get(tabId) === tab.url) {
			return;
		}

		activeInjectionUrls.set(tabId, tab.url);

		// Ensure this is an HTTP or HTTPS URL
		if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
			activeInjectionUrls.delete(tabId);
			return; // Not a web page; do not inject
		}

		try {
			// Get the domain from the URL
			let url = new URL(tab.url);
			let domain = url.hostname;

			// Get all injection scripts from storage
			chrome.storage.local.get('scripts', async (data) => {
				const scripts = data.scripts || {};
				const matchingScripts = [];

				// Check whether the current domain has a matching injection script
				for (const key in scripts) {
					// Match either the exact domain or a wildcard domain
					if (domain === scripts[key].domain ||
						(scripts[key].domain.startsWith('*.') && domain.endsWith(scripts[key].domain.substring(1)))) {

						// Check whether the script is enabled; default to enabled when unspecified
						const isEnabled = scripts[key].enabled !== false;

						// Inject only enabled scripts
						if (!isEnabled) {
							// console.log(`${skipDisabledScriptMessage()}: ${scripts[key].name || defaultScriptName()} (${scripts[key].domain})`);
							continue; // Skip disabled scripts
						}

						if (scripts[key].name === 'executeWhenSignalsIsLoaded.js') {
							continue;
						}

						matchingScripts.push(scripts[key]);
					}
				}

				if (matchingScripts.length > 0 || domain.endsWith(signalsGateHost)) {
					injectScriptsInOrder(tabId, matchingScripts, domain)
						.catch(error => console.error(allInjectFailureAlert(), error));
				} else {
					activeInjectionUrls.delete(tabId);
				}
			});
		} catch (error) {
			console.error(t('url_processing_failed'), error);
		}
	}
});

async function injectScriptsInOrder(tabId, scripts, domain) {
	if (domain.endsWith(signalsGateHost)) {
		const gateResponse = await fetch(chrome.runtime.getURL(signalsGatePath));
		if (!gateResponse.ok) {
			throw new Error(`Failed to load ${signalsGatePath}: ${gateResponse.status}`);
		}

		const gateScript = {
			name: 'executeWhenSignalsIsLoaded.js',
			code: await gateResponse.text()
		};

		await injectScriptWithFallback(tabId, gateScript);
		await waitForSignalsReady(tabId);
	}

	for (const script of scripts) {
		await injectScriptWithFallback(tabId, script);
	}
}

async function injectScriptWithFallback(tabId, scriptInfo) {
	try {
		const result = await injectWithContentScript(tabId, scriptInfo);
		// console.log(injectionSuccessMessage(), result);
		return result;
	} catch (error) {
		console.error(injectionFailureAlert(), error);
	}

	try {
		const result = await injectHelperScript(tabId).then(() => injectUserScript(tabId, scriptInfo));
		// console.log(secondaryInjectSuccessMessage(), result);
		return result;
	} catch (error) {
		console.error(secondaryInjectFailureAlert(), error);
	}

	try {
		const result = await fallbackInjection(tabId, scriptInfo);
		// console.log(tertiaryInjectSuccessMessage(), result);
		return result;
	} catch (error) {
		console.error(tertiaryInjectFailureAlert(), error);
	}

	const result = await strictCSPFallback(tabId, scriptInfo);
	// console.log(strictCSPInjectMessage() + (result ? t('injection_succeeded_suffix') : t('injection_failed_suffix')));
	return result;
}

async function waitForSignalsReady(tabId) {
	return chrome.scripting.executeScript({
		target: { tabId },
		world: 'MAIN',
		func: () => new Promise((resolve, reject) => {
			if (window.__signalsPageReady) {
				resolve(true);
				return;
			}

			const eventName = 'signals-page-ready';
			const handleReady = () => {
				window.removeEventListener(eventName, handleReady);
				resolve(true);
			};

			window.addEventListener(eventName, handleReady, { once: true });
			setTimeout(() => {
				window.removeEventListener(eventName, handleReady);
				reject(new Error('Timed out waiting for Signals to finish loading'));
			}, 120000);
		})
	});
}

// Inject through a content script - this is the most reliable method and bypasses most CSP restrictions
async function injectWithContentScript(tabId, scriptInfo) {
	// Get the full URLs for extension resources
	const injectorUrl = `${chrome.runtime.getURL('injected-scripts/injector.js')}?success=${encodeURIComponent(t('script_execution_succeeded'))}&error=${encodeURIComponent(t('script_execution_failed'))}&loaded=${encodeURIComponent(t('injector_loaded'))}`;
	const executorUrl = chrome.runtime.getURL('injected-scripts/executor.js');

	// First, try injecting directly as a content script
	// This runs in the extension context and bypasses the website's CSP
	return chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: triggerInjection,
		args: [scriptInfo, injectorUrl, executorUrl],
		world: "MAIN" // Run in the main world to access the page's DOM and JavaScript context
	});
}


// Trigger the injection process in the page
async function triggerInjection(scriptInfo, injectorUrl, executorUrl) {
	try {
		// Create a URL for a script file
		const createScriptFileUrl = (code) => {
			const blob = new Blob([code], { type: 'application/javascript' });
			return URL.createObjectURL(blob);
		};

		// Add the executor script
		const loadExecutorScript = () => {
			return new Promise((resolve, reject) => {
				// Generate a unique ID for script communication
				const scriptId = 'js-injector-' + Date.now();

				// Create a message listener
				const messageHandler = (event) => {
					if (event.source !== window) return;

					if (event.data && event.data.type === 'js-injector-ready' &&
						event.data.id === scriptId) {
						// Send the code to execute when executor.js is ready
						window.postMessage({
							type: 'js-injector-execute',
							id: scriptId,
							name: scriptInfo.name || 'Unnamed script',
							code: scriptInfo.code
						}, '*');
					}

					if (event.data && event.data.type === 'js-injector-executed' &&
						event.data.id === scriptId) {
						// Remove the listener when execution is complete
						window.removeEventListener('message', messageHandler);

						if (event.data.success) {
							resolve(true);
						} else {
							reject(new Error(event.data.error || 'Execution failed'));
						}
					}
				};

				// Add the message listener
				window.addEventListener('message', messageHandler);

				// Create the script element
				const script = document.createElement('script');
				const separator = executorUrl.includes('?') ? '&' : '?';
				script.src = `${executorUrl}${separator}id=${scriptId}&t=${Date.now()}`;
				script.setAttribute('data-js-injector', 'executor');
				document.head.appendChild(script);

				// Set a timeout
				setTimeout(() => {
					window.removeEventListener('message', messageHandler);
					  reject(new Error('Execution timed out'));
				}, 10000);
			});
		};

		// Try executing with the executor script
		try {
			await loadExecutorScript();
			return { success: true, method: 'executor' };
		} catch (executorError) {
			console.warn('Executor script execution failed:', executorError);

			// Try executing with the helper script
			const loadHelperScript = () => {
				return new Promise((resolve, reject) => {
					if (window._JSInjector) {
						resolve(true);
						return;
					}

					const helperScript = document.createElement('script');
					helperScript.onload = () => resolve(true);
					  helperScript.onerror = (e) => reject(new Error(`${t('helper_script_load_failed')} ${e.message}`));
					helperScript.src = injectorUrl;
					document.head.appendChild(helperScript);
				});
			};

			try {
				// Run the injection flow
				await loadHelperScript();

				// Use the helper when it loaded successfully and provides injectScript
				if (window._JSInjector && typeof window._JSInjector.injectScript === 'function') {
					window._JSInjector.injectScript(scriptInfo.code, scriptInfo.name);
					return { success: true, method: 'helper' };
				}
			} catch (helperError) {
				console.warn('Helper script execution failed:', helperError);
			}

			// Finally, try the Blob URL method
			const loadUserScript = () => {
				// In strict CSP environments, use a Blob URL instead of an inline script
				const userScriptUrl = createScriptFileUrl(`
          (function() {
            try {
              ${scriptInfo.code}
			  // console.log('Script execution succeeded');
            } catch (error) {
			  console.error('Script execution failed:', error);
            }
          })();
        `);

				const scriptElem = document.createElement('script');
				scriptElem.src = userScriptUrl;
				document.head.appendChild(scriptElem);

				// Clean up the Blob URL
				setTimeout(() => URL.revokeObjectURL(userScriptUrl), 5000);
			};

			// Use direct injection
			loadUserScript();
			return { success: true, method: 'direct-blob' };
		}
	} catch (error) {
		console.error('Injection execution failed:', error);
		return { success: false, error: error.message };
	}
}

// Inject the helper script
async function injectHelperScript(tabId) {
	// Get the URL of injector.js in the extension
	const injectorUrl = chrome.runtime.getURL('injected-scripts/injector.js');

	// Inject the loader script
	return chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: (url) => {
			// Check whether it has already been injected
			if (window._JSInjector) {
				return true;
			}

			// Create a script tag to load injector.js
			const script = document.createElement('script');
			script.src = url;
			script.id = 'js-injector-loader';
			document.head.appendChild(script);

			return true;
		},
		args: [injectorUrl]
	});
}

// Inject the user script
async function injectUserScript(tabId, scriptInfo) {
	return chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: (scriptData) => {
			// Wait for the helper script to finish loading
			const checkInterval = setInterval(() => {
				if (window._JSInjector) {
					clearInterval(checkInterval);

					// Use the helper script to inject the user code
					window._JSInjector.injectScript(
						scriptData.code,
						scriptData.name
					);
				}
			}, 50);

			// Stop waiting if it has not loaded after 5 seconds
			setTimeout(() => clearInterval(checkInterval), 5000);

			return true;
		},
		args: [scriptInfo]
	});
}

// Fallback injection method - dynamically add an external script
async function fallbackInjection(tabId, scriptInfo) {
	return chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: (code, name) => {
			try {
				// Create an isolated scope with an immediately invoked anonymous function
				const executeInPage = (codeToExecute, scriptName) => {
					// Create a Blob URL to avoid an inline script
					const wrappedCode = `
            (function() {
              try {
                ${codeToExecute}
				// console.log('"${scriptName}" execution succeeded');
              } catch(err) {
				console.error('"${scriptName}" execution failed:', err);
              }
            })();
          `;

					// Create the Blob object and URL
					const blob = new Blob([wrappedCode], { type: 'application/javascript' });
					const blobUrl = URL.createObjectURL(blob);

					// Create the script element and use the Blob URL
					const script = document.createElement('script');
					script.src = blobUrl;
					script.setAttribute('data-js-injector', 'fallback');
					script.setAttribute('data-script-name', scriptName);

					// Add it to the document head
					document.head.appendChild(script);

					// Release the Blob URL (delay this to ensure the script has loaded)
					setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

					return true;
				};

				// Execute the code
				return executeInPage(code, name);
			} catch (error) {
				console.error('Fallback injection method failed:', error);
				return false;
			}
		},
		args: [scriptInfo.code, scriptInfo.name || t('unnamed_script')]
	}).catch(error => {
		console.error(t('fallback_execution_failed'), error);
	});
}

// Strict-CSP-compatible fallback injection - use dynamic import or fetch to bypass CSP restrictions
async function strictCSPFallback(tabId, scriptInfo) {
	return chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: (code, name) => {
			try {
				// Method 1: use dynamic import to import a module from a Blob URL
				const tryImportMethod = async () => {
					try {
						// Create code in ES module format
						const moduleCode = `
              export default async function() {
                try {
                  ${code}
				  // console.log('"${name}" (ES module) execution succeeded');
                  return true;
                } catch(err) {
				  console.error('"${name}" (ES module) execution failed:', err);
                  return false;
                }
              }
            `;

						// Create a Blob URL
						const blob = new Blob([moduleCode], { type: 'application/javascript' });
						const moduleUrl = URL.createObjectURL(blob);

						// Dynamically import the module
						const module = await import(moduleUrl);

						// Execute the default export
						const result = await module.default();

						// Clean up
						setTimeout(() => URL.revokeObjectURL(moduleUrl), 1000);

						return result;
					} catch (error) {
						console.warn('ES module execution failed:', error);
						return false;
					}
				};

				// Method 2: use fetch and a dynamically created Worker
				const tryWorkerMethod = async () => {
					try {
						// Create the Worker code
						const workerCode = `
              self.onmessage = function(e) {
                try {
                  // Execute the code with eval in the Worker context
                  // Workers usually have their own CSP context
                  eval(e.data.code);
                  self.postMessage({ success: true });
                } catch (error) {
                  self.postMessage({ success: false, error: error.message });
                }
              };
            `;

						// Create a Blob URL
						const blob = new Blob([workerCode], { type: 'application/javascript' });
						const workerUrl = URL.createObjectURL(blob);

						// Create the Worker
						const worker = new Worker(workerUrl);

						// Return a Promise that waits for the Worker result
						return new Promise((resolve) => {
							worker.onmessage = function (e) {
								if (e.data.success) {
									  // console.log('"${name}" (Worker) execution succeeded');
								} else {
									  console.error('"${name}" (Worker) execution failed:', e.data.error);
								}

								// Terminate the Worker and clean up
								worker.terminate();
								URL.revokeObjectURL(workerUrl);
								resolve(e.data.success);
							};

							// Send the code to the Worker
							worker.postMessage({ code });

							// Set a timeout
							setTimeout(() => {
								worker.terminate();
								URL.revokeObjectURL(workerUrl);
								resolve(false);
							}, 5000);
						});
					} catch (error) {
						console.warn('Worker execution failed:', error);
						return false;
					}
				};

				// Method 3: use a Data URL as the iframe src (a broadly compatible method)
				const tryIframeMethod = () => {
					try {
						// Create a hidden iframe
						const iframe = document.createElement('iframe');
						iframe.style.display = 'none';

						// Prepare the HTML content to execute in the iframe
						const htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <script>
                  try {
                    ${code}
                    window.parent.postMessage({ type: 'js-injector-result', success: true }, '*');
                  } catch(err) {
					console.error('Execution failed:', err);
                    window.parent.postMessage({ 
                      type: 'js-injector-result', 
                      success: false, 
                      error: err.message 
                    }, '*');
                  }
                </script>
              </head>
              <body></body>
              </html>
            `;

						// Create the Data URL
						const dataUrl = 'data:text/html;base64,' + btoa(htmlContent);

						// Set the frame src and add it to the document
						iframe.src = dataUrl;

						// Create the message handler
						return new Promise((resolve) => {
							const messageHandler = (event) => {
								if (event.data && event.data.type === 'js-injector-result') {
									window.removeEventListener('message', messageHandler);
									document.body.removeChild(iframe);

									if (event.data.success) {
										// console.log('"${name}" (iframe) execution succeeded');
									} else {
										console.error('"${name}" (iframe) execution failed:',
											event.data.error);
									}

									resolve(event.data.success);
								}
							};

							window.addEventListener('message', messageHandler);
							document.body.appendChild(iframe);

							// Set a timeout
							setTimeout(() => {
								window.removeEventListener('message', messageHandler);
								if (document.body.contains(iframe)) {
									document.body.removeChild(iframe);
								}
								resolve(false);
							}, 5000);
						});
					} catch (error) {
						console.warn('iframe execution failed:', error);
						return false;
					}
				};

				// Try the methods in sequence
				return Promise.resolve()
					.then(tryImportMethod)
					.then(result => result ? result : tryWorkerMethod())
					.then(result => result ? result : tryIframeMethod())
					.catch(error => {
						console.error('All CSP-compatible methods failed:', error);
						return false;
					});
			} catch (error) {
				console.error('Strict-CSP-compatible injection failed:', error);
				return false;
			}
		},
		args: [scriptInfo.code, scriptInfo.name || t('unnamed_script')]
	}).catch(error => {
		console.error(t('strict_csp_execution_failed'), error);
	});
} 