// Import the i18n module
import { i18n, translator } from './i18n/index.js';

document.addEventListener('DOMContentLoaded', async () => {
	// Initialize the theme
	initTheme();

	// Add theme and language switch buttons
	const header = document.querySelector('h1');

	// Language switch button
	const langToggle = document.createElement('button');
	langToggle.id = 'lang-toggle';
	langToggle.innerHTML = `<span style="display: flex; align-items: center; gap: 4px;">
    <span style="font-size: 18px;">🌐</span><span data-i18n="language">语言</span>
  </span>`;
	langToggle.title = 'Switch Language / 切换语言';
	langToggle.className = 'lang-toggle';
	langToggle.addEventListener('click', toggleLanguage);
	header.appendChild(langToggle);

	// Theme switch button
	const themeToggle = document.createElement('button');
	themeToggle.id = 'toggle-theme';
	themeToggle.innerHTML = `<span style="display: flex; align-items: center; gap: 4px;">
    <span style="font-size: 18px;">🌓</span><span data-i18n="theme">主题</span>
  </span>`;
	themeToggle.title = i18n.t('toggle_dark_mode');
	themeToggle.className = 'lang-toggle';
	themeToggle.addEventListener('click', toggleTheme);
	header.appendChild(themeToggle);

	// Initialize page translations
	translator.translatePage();

	// Toggle the language
	function toggleLanguage() {
		// Get the current language
		const currentLang = i18n.getLanguage();
		// Toggle the language
		const newLang = currentLang === 'en' ? 'zh' : 'en';
		// Set the new language
		i18n.setLanguage(newLang);
		// Show a notification
		showMessage(newLang === 'en' ? 'Switched to English' : '已切换到中文', 'info');
	}

	// Get DOM elements
	const scriptsList = document.getElementById('scripts-list');
	const emptyState = document.getElementById('empty-state');
	const scriptsTable = document.getElementById('scripts-table');
	const addNewButton = document.getElementById('add-new');
	const searchInput = document.getElementById('search');

	// Get all scripts
	let scripts = {};
	let filteredScripts = {};

	// Load the script list
	async function loadScripts() {
		try {
			const data = await chrome.storage.local.get('scripts');
			scripts = data.scripts || {};
			filteredScripts = { ...scripts };
			renderScriptsList();
		} catch (error) {
			console.error('加载脚本时出错:', error);
			showError(i18n.t('load_scripts_failed'));
		}
	}

	// Render the script list
	function renderScriptsList() {
		scriptsList.innerHTML = '';

		const scriptIds = Object.keys(filteredScripts);

		if (scriptIds.length === 0) {
			scriptsTable.style.display = 'none';
			emptyState.style.display = 'block';
			return;
		}

		scriptsTable.style.display = 'table';
		emptyState.style.display = 'none';

		// Sort by update time (newest first)
		scriptIds.sort((a, b) => filteredScripts[b].updatedAt - filteredScripts[a].updatedAt);

		// Create a table row
		scriptIds.forEach(id => {
			const script = filteredScripts[id];
			const tr = document.createElement('tr');

			// Create table cells
			const nameTd = document.createElement('td');
			nameTd.textContent = script.name;

			const domainTd = document.createElement('td');
			domainTd.textContent = script.domain;

			const createdAtTd = document.createElement('td');
			createdAtTd.textContent = formatDate(script.createdAt);

			const updatedAtTd = document.createElement('td');
			updatedAtTd.textContent = formatDate(script.updatedAt);

			const actionsTd = document.createElement('td');
			actionsTd.className = 'actions';

			// Edit button
			const editButton = document.createElement('button');
			editButton.className = 'small';
			editButton.textContent = i18n.t('edit');
			editButton.addEventListener('click', () => {
				window.location.href = `editor.html?id=${id}`;
			});

			// Delete button
			const deleteButton = document.createElement('button');
			deleteButton.className = 'small danger';
			deleteButton.textContent = i18n.t('delete');
			deleteButton.addEventListener('click', async () => {
				if (confirm(i18n.t('confirm_delete_script', { name: script.name }))) {
					try {
						delete scripts[id];
						await chrome.storage.local.set({ scripts });
						loadScripts();
					} catch (error) {
						console.error('删除脚本时出错:', error);
						alert(i18n.t('delete_script_failed'));
					}
				}
			});

			// Add buttons to the actions cell
			actionsTd.appendChild(editButton);
			actionsTd.appendChild(deleteButton);

			// Add all cells to the row
			tr.appendChild(nameTd);
			tr.appendChild(domainTd);
			tr.appendChild(createdAtTd);
			tr.appendChild(updatedAtTd);
			tr.appendChild(actionsTd);

			// Add the row to the table
			scriptsList.appendChild(tr);
		});
	}

	// Show an error message
	function showError(message) {
		const errorDiv = document.createElement('div');
		errorDiv.className = 'error-message';
		errorDiv.textContent = message;
		document.body.insertBefore(errorDiv, scriptsTable);

		// Hide the error message automatically after 3 seconds
		setTimeout(() => {
			errorDiv.style.opacity = '0';
			setTimeout(() => errorDiv.remove(), 500);
		}, 3000);
	}

	// Show a message
	function showMessage(message, type) {
		const messageDiv = document.createElement('div');
		messageDiv.className = `error-message ${type === 'info' ? 'info-message' : ''}`;
		messageDiv.textContent = message;
		messageDiv.style.backgroundColor = type === 'info' ? '#4285f4' : '#ea4335';
		document.body.insertBefore(messageDiv, scriptsTable);

		// Hide the message automatically after 3 seconds
		setTimeout(() => {
			messageDiv.style.opacity = '0';
			setTimeout(() => messageDiv.remove(), 500);
		}, 3000);
	}

	// Format a date
	function formatDate(timestamp) {
		const date = new Date(timestamp);
		return date.toLocaleString();
	}

	// Search scripts
	function searchScripts(query) {
		query = query.toLowerCase();

		if (!query) {
			filteredScripts = { ...scripts };
		} else {
			filteredScripts = {};

			for (const id in scripts) {
				const script = scripts[id];
				if (
					script.name.toLowerCase().includes(query) ||
					script.domain.toLowerCase().includes(query)
				) {
					filteredScripts[id] = script;
				}
			}
		}

		renderScriptsList();
	}

	// Add the new script button event
	addNewButton.addEventListener('click', () => {
		window.location.href = 'editor.html';
	});

	// Search box event
	searchInput.addEventListener('input', () => {
		searchScripts(searchInput.value);
	});

	// Initialize the theme
	function initTheme() {
		// Get the theme setting from local storage
		chrome.storage.local.get('darkMode', (data) => {
			const isDarkMode = data.darkMode === true;
			applyTheme(isDarkMode);
		});
	}

	// Apply the theme
	function applyTheme(isDark) {
		if (isDark) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}

	// Toggle the theme
	function toggleTheme() {
		const currentTheme = document.documentElement.getAttribute('data-theme');
		const isDarkMode = currentTheme === 'dark';

		// Apply the theme
		applyTheme(!isDarkMode);

		// Save the theme setting
		chrome.storage.local.set({ darkMode: !isDarkMode });

		// Show a theme switch notification
		showMessage(isDarkMode ? i18n.t('switched_to_light_theme') : i18n.t('switched_to_dark_theme'), 'info');
	}

	// Load the script list
	loadScripts();
}); 