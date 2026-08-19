# Signals Inspector Chrome Extension

A Chrome browser extension that lets you inject custom JavaScript code into any website.

## Features

- Inject custom JavaScript code on any website
- Manage scripts by domain
- Support wildcard matching for subdomains
- Provide a script management interface to add, edit, and delete scripts
- Support importing/exporting script data for backup
- Compatible with websites under various Content Security Policy (CSP) restrictions

## Use Cases

### Development and Debugging
- Test JavaScript functionality without modifying the website source code
- Rapid prototyping and feature validation
- Debug issues on third-party websites

### Website Enhancement
- Add custom buttons, menus, or features to frequently used websites
- Improve website UI and user experience
- Auto-fill forms or automate repetitive actions

### Data Scraping and Analysis
- Extract specific data from web pages
- Add analytics features to websites
- Perform custom data processing

### Personal Customization
- Hide unwanted elements on websites
- Adjust website styles and layout
- Create custom shortcuts and features

### Learning and Education
- Learn JavaScript and DOM manipulation
- Test how different scripts execute
- Understand how websites work

## Installation

### Install from the Chrome Web Store (not applicable until published)

1. Visit the Chrome Web Store
2. Search for "Signals Inspector"
3. Click the "Add to Chrome" button

### Manual Installation (Developer Mode)

1. Download or clone this repository locally
2. Open Chrome and go to the extensions management page: `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the folder containing this project's files
6. The extension will be installed in your browser

## Usage

### Adding a New Script

1. Click the Signals Inspector icon in the browser toolbar
2. While visiting a website, click "Add script for current site"
3. On the editor page that opens:
   - The domain field is automatically filled with the current website's domain
   - Enter a script name
   - Enter the JavaScript code you want to inject in the code editor
   - Click the "Save" button

### Managing Scripts

1. Click the Signals Inspector icon in the browser toolbar
2. Click "Manage all scripts"
3. On the management page, you can:
   - View all added scripts
   - Search scripts
   - Edit existing scripts
   - Delete scripts you no longer need

### Importing/Exporting Data

1. Click the Signals Inspector icon in the browser toolbar
2. Click "Options"
3. On the options page:
   - Click "Export Data" to download a JSON file containing all scripts
   - Click "Import Data" to select a previously exported JSON file

## Compatibility Notes

### Content Security Policy (CSP) Restrictions

Some websites enforce a strict Content Security Policy, which can limit script injection capabilities. Signals Inspector uses multiple methods to try to work around these restrictions:

1. Script tag injection - executes code by creating a `<script>` tag
2. Helper script method - loads a helper script using the web_accessible_resources mechanism
3. Blob URL method - creates a Blob URL to avoid inline script restrictions
4. ES module method - uses dynamic `import()` to import a module
5. Worker method - executes code inside a Web Worker
6. iframe data URL method - executes code in an isolated environment

Even so, some websites with extremely strict CSPs may still block script injection. In that case, you may need to:

- Try simplifying your script
- Use DOM manipulation instead of directly executing JavaScript
- Consider using another extension or method

## Notes

- Injected JavaScript code runs in the context of the target website; write your code carefully to avoid breaking website functionality
- Malicious use of this extension may violate the terms of service of some websites
- This extension is intended for learning and development/testing purposes only
- Script injection may not work on websites with strict security policies

## Icon Replacement

The extension currently uses placeholder icon files. You need to replace the following files with real PNG icons:

- images/icon16.png (16x16 pixels)
- images/icon48.png (48x48 pixels)
- images/icon128.png (128x128 pixels)

## Author

**Todd** - [https://github.com/todd](https://github.com/todd)

## License

[MIT License](LICENSE)
