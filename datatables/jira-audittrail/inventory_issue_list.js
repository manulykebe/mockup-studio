function getIssueSummary(item) {
  const directText = (item.innerText || item.textContent || '').replace(/\s+/g, ' ').trim();
  if (directText) {
    return directText;
  }

  return (item.getAttribute('title') || item.getAttribute('aria-label') || '').trim();
}

function extractIssueKey(item, href) {
  const hrefValue = href || item.getAttribute('href') || '';
  const match = hrefValue.match(/\/browse\/([A-Za-z0-9-]+)/i);
  if (match) {
    return match[1].toUpperCase();
  }

  const text = (item.innerText || item.textContent || '').replace(/\s+/g, ' ').trim();
  const textMatch = text.match(/\b([A-Z]+-\d+)\b/);
  return textMatch ? textMatch[1] : null;
}

function getIssueEntries(containerSelector = '.issue-list', itemSelector = null) {
  const containers = Array.from(document.querySelectorAll(containerSelector));
  const entries = [];

  containers.forEach((container) => {
    let items = [];

    if (itemSelector) {
      items = Array.from(container.querySelectorAll(itemSelector));
    } else {
      items = Array.from(container.querySelectorAll('a[href*="/browse/"], a[href*="/issues/"]'));
    }

    items.forEach((item) => {
      const summary = getIssueSummary(item);
      if (!summary || summary.length < 3) {
        return;
      }

      const href = item.getAttribute('href') || item.getAttribute('data-href') || '';
      const issueKey = extractIssueKey(item, href);
      if (!issueKey) {
        return;
      }

      entries.push({
        issueKey,
        summary,
        href
      });
    });
  });

  return entries;
}

function inventoryIssueList(containerSelector = '.issue-list', itemSelector = null) {
  return getIssueEntries(containerSelector, itemSelector).map((entry) => ({
    report_name: entry.summary,
    summary: entry.summary,
    href: entry.href
  }));
}

function exportIssueListCsv(containerSelector = '.issue-list', itemSelector = null, fileName = 'issue_inventory.csv') {
  const rows = inventoryIssueList(containerSelector, itemSelector);
  if (!rows.length) {
    console.warn('No issue rows found.');
    return null;
  }

  const header = ['report_name', 'summary', 'href'];
  const csvRows = [header.join(';')];

  rows.forEach((row) => {
    const values = header.map((key) => {
      const value = String(row[key] || '');
      return '"' + value.replace(/"/g, '""') + '"';
    });
    csvRows.push(values.join(';'));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return rows;
}

function waitForElement(selector, timeoutMs = 4000) {
  return new Promise(function(resolve) {
    const start = Date.now();
    function check() {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(check, 100);
    }
    check();
  });
}

async function exportIssueListXml(containerSelector = '.issue-list', itemSelector = null, delayMs = 500) {
  const entries = getIssueEntries(containerSelector, itemSelector);
  if (!entries.length) {
    console.warn('No issue rows found.');
    return [];
  }

  const results = [];
  for (const entry of entries) {
    const issueLink = Array.from(document.querySelectorAll('a[href*="/browse/' + entry.issueKey + '"]')).find(function(link) {
      return (link.textContent || '').toUpperCase().indexOf(entry.issueKey) !== -1;
    });

    if (!issueLink) {
      console.warn('Issue link not found for ' + entry.issueKey);
      continue;
    }

    const container = issueLink.closest('tr, li, div, .issue-row, .splitview-issue');
    let openTrigger = null;

    if (container) {
      openTrigger = container.querySelector('a.issue-actions-trigger, a.aui-dropdown2-trigger, button[aria-label*="Actions"], [data-testid="issue-actions"]');
    }

    if (!openTrigger) {
      openTrigger = document.querySelector('a.issue-actions-trigger');
    }

    if (openTrigger) {
      openTrigger.click();
    }

    const xmlItem = await waitForElement('a[role="menuitem"][href*="issue-xml"], a[role="menuitem"]', 3000);
    if (xmlItem) {
      const href = xmlItem.getAttribute('href') || '';
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        xmlItem.click();
      }
    }

    results.push({ issueKey: entry.issueKey, file: entry.issueKey + '.xml' });

    if (delayMs > 0) {
      await new Promise(function(resolve) {
        setTimeout(resolve, delayMs);
      });
    }
  }

  return results;
}

window.inventoryIssueList = inventoryIssueList;
window.exportIssueListCsv = exportIssueListCsv;
window.exportIssueListXml = exportIssueListXml;

// Example usage:
// inventoryIssueList();
// exportIssueListCsv();
exportIssueListXml();
