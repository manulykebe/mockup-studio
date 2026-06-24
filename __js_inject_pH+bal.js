async function waitForSpinner() {
    const selector = 'div.loading.loading-spinner.loading-lg';

    if (!document.querySelector(selector)) {
        return;
    }

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (!document.querySelector(selector)) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    });
}

function runAfterSpinner() {
    waitForSpinner().then(() => {
        window.dispatchEvent(new CustomEvent('spinner-unloaded'));
        makeCollapsible();
        new Tablesort(document.getElementsByClassName('table table-zebra w-full')[0])
        document.getElementsByClassName('table table-zebra w-full')[0].classList.remove('table')
        // document.getElementsByClassName('table-zebra w-full')[0].classList.add('border-spacing-y-1') //tailwind needs to compile
        document.getElementsByClassName('table-zebra w-full')[0].style.borderCollapse='separate'    
        document.getElementsByClassName('table-zebra w-full')[0].style.borderSpacing='0px 4px'
    });
}


// Call the function when DOM is ready with 1 second delay
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runAfterSpinner, 1000);
    });
} else {
    setTimeout(runAfterSpinner, 1000);
}

/**
 * Makes H3 sections collapsible with expand/collapse icons
 * By default, sections are collapsed
 */
function makeCollapsible() {
    // Find all H3 elements
    const h3Elements = document.querySelectorAll('h3');

    h3Elements.forEach((h3) => {

        h3.classList.remove('mb-3');
        // Create the collapsible icon
        const icon = document.createElement('span');
        icon.className = 'collapsible-icon';
        icon.innerHTML = '›'; // Right-pointing arrow (collapsed state)
        icon.style.cssText = `
      display: inline-block;
      transition: transform 0.3s ease;
      cursor: pointer;
      margin-right: 0;
    `;

        // Insert icon as first child of H3
        h3.insertBefore(icon, h3.firstChild);

        // Make H3 clickable for toggling
        h3.style.cursor = 'pointer';
        h3.style.userSelect = 'none';
        h3.style.display = 'flex';
        h3.style.alignItems = 'center';

        // Create a content wrapper for all content after the H3
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-content';
        contentWrapper.style.cssText = `
      display: none;
      overflow: hidden;
    `;

        // Move all siblings (except the icon and H3) into the content wrapper
        let nextSibling = h3.nextElementSibling;
        while (nextSibling) {
            const tempNext = nextSibling.nextElementSibling;
            contentWrapper.appendChild(nextSibling);
            nextSibling = tempNext;
        }

        // Insert the content wrapper after the H3
        h3.insertAdjacentElement('afterend', contentWrapper);

        const getSummaryColors = (wrapper) => {
            const labels = Array.from(wrapper.querySelectorAll('label'));
            const fieldElements = labels.length > 0 ? labels : Array.from(wrapper.children);

            return fieldElements.map((fieldEl) => {
                const block = fieldEl.closest('div') || fieldEl;
                let bgElem = block.querySelector('[class*="bg-"]');
                if (!bgElem) {
                    bgElem = block.querySelector('[style*="background"]');
                }
                if (!bgElem && block !== fieldEl) {
                    bgElem = fieldEl;
                }

                const bg = bgElem ? window.getComputedStyle(bgElem).backgroundColor : '';
                return (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') ? bg : '#e5e7eb';
            });
        };

        const createSummary = (colors) => {
            const summary = document.createElement('div');
            summary.className = 'collapsible-summary';
            summary.setAttribute('aria-hidden', 'true');
            summary.style.display = 'inline-flex';
            summary.style.alignItems = 'center';
            summary.style.gap = '6px';
            summary.style.marginLeft = 'auto';
            summary.style.paddingLeft = '8px';

            colors.forEach((color) => {
                const sw = document.createElement('span');
                sw.style.width = '12px';
                sw.style.height = '12px';
                sw.style.display = 'inline-block';
                sw.style.backgroundColor = color;
                sw.style.border = '1px solid rgba(0,0,0,0.12)';
                sw.style.borderRadius = '2px';
                sw.style.boxSizing = 'border-box';
                summary.appendChild(sw);
            });

            return summary;
        };

        const toggleCollapse = () => {
            const isCollapsed = contentWrapper.style.display === 'none';

            if (isCollapsed) {
                // Expand: show content and remove any existing summary
                contentWrapper.style.display = 'block';
                icon.style.transform = 'rotate(90deg)';
                if (h3._collapsibleSummary) {
                    try { h3._collapsibleSummary.remove(); } catch (e) { /* ignore */ }
                    delete h3._collapsibleSummary;
                }
            } else {
                // Collapse: hide content and build a small summary of field colors
                contentWrapper.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';

                const colors = getSummaryColors(contentWrapper);
                if (colors.length > 0) {
                    const summary = createSummary(colors);

                    if (h3._collapsibleSummary) {
                        try { h3._collapsibleSummary.remove(); } catch (e) { /* ignore */ }
                    }
                    h3.appendChild(summary);
                    h3._collapsibleSummary = summary;
                }
            }
        };

        // Update summary squares when a select value changes while panel is collapsed
        const selects = contentWrapper.querySelectorAll('select.select.select-bordered.w-full');
        selects.forEach((sel) => {
            sel.addEventListener('change', () => {
                const wrapper = sel.closest('.collapsible-content');
                const header = wrapper ? wrapper.previousElementSibling : null;
                if (!header) return;
                // Only update if a summary currently exists (panel is collapsed)
                if (!header._collapsibleSummary) return;

                const colors = getSummaryColors(wrapper);
                if (colors.length > 0) {
                    const newSummary = createSummary(colors);
                    try { header._collapsibleSummary.remove(); } catch (e) { /* ignore */ }
                    header.appendChild(newSummary);
                    header._collapsibleSummary = newSummary;
                } else {
                    try { header._collapsibleSummary.remove(); } catch (e) { /* ignore */ }
                    delete header._collapsibleSummary;
                }
            });
        });

        icon.addEventListener('click', toggleCollapse);
        h3.addEventListener('click', toggleCollapse);

        // Show summary squares immediately on initialization when the section starts collapsed
        if (contentWrapper.style.display === 'none') {
            const colors = getSummaryColors(contentWrapper);
            if (colors.length > 0) {
                const summary = createSummary(colors);
                h3.appendChild(summary);
                h3._collapsibleSummary = summary;
            }
        }
    });
};

(function() {
  function Tablesort(el, options) {
    if (!(this instanceof Tablesort)) return new Tablesort(el, options);

    if (!el || el.tagName !== 'TABLE') {
      throw new Error('Element must be a table');
    }
    this.init(el, options || {});
  }

  var sortOptions = [];

  var createEvent = function(name) {
    var evt;

    if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
      evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(name, false, false, undefined);
    } else {
      evt = new CustomEvent(name);
    }

    return evt;
  };
  
  var getInnerText = function(el, options) {
    var sortAttribute = options.sortAttribute || 'data-sort';
    if (el.hasAttribute(sortAttribute)) {
      return el.getAttribute(sortAttribute);
    }
    return el.textContent || el.innerText || '';
  };

  // Default sort method if no better sort method is found
  var caseInsensitiveSort = function(a, b) {
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();

    if (a === b) return 0;
    if (a < b) return 1;

    return -1;
  };

  var getCellByKey = function(cells, key) {
    return [].slice.call(cells).find(function(cell) {
      return cell.getAttribute('data-sort-column-key') === key;
    });
  };

  // Stable sort function
  // If two elements are equal under the original sort function,
  // then there relative order is reversed
  var stabilize = function(sort, antiStabilize) {
    return function(a, b) {
      var unstableResult = sort(a.td, b.td);

      if (unstableResult === 0) {
        if (antiStabilize) return b.index - a.index;
        return a.index - b.index;
      }

      return unstableResult;
    };
  };

  Tablesort.extend = function(name, pattern, sort) {
    if (typeof pattern !== 'function' || typeof sort !== 'function') {
      throw new Error('Pattern and sort must be a function');
    }

    sortOptions.push({
      name: name,
      pattern: pattern,
      sort: sort
    });
  };

  Tablesort.prototype = {

    init: function(el, options) {
      var that = this,
          firstRow,
          defaultSort,
          i,
          cell;

      that.table = el;
      that.thead = false;
      that.options = options;

      if (el.rows && el.rows.length > 0) {
        if (el.tHead && el.tHead.rows.length > 0) {
          for (i = 0; i < el.tHead.rows.length; i++) {
            if (el.tHead.rows[i].getAttribute('data-sort-method') === 'thead') {
              firstRow = el.tHead.rows[i];
              break;
            }
          }
          if (!firstRow) {
            firstRow = el.tHead.rows[el.tHead.rows.length - 1];
          }
          that.thead = true;
        } else {
          firstRow = el.rows[0];
        }
      }

      if (!firstRow) return;

      var onClick = function() {
        if (that.current && that.current !== this) {
          that.current.removeAttribute('aria-sort');
        }

        that.current = this;
        that.sortTable(this);
      };

      // Assume first row is the header and attach a click handler to each.
      for (i = 0; i < firstRow.cells.length; i++) {
        cell = firstRow.cells[i];
        cell.setAttribute('role','columnheader');
        if (cell.getAttribute('data-sort-method') !== 'none') {
          cell.tabIndex = 0;
          cell.addEventListener('click', onClick, false);

          cell.addEventListener('keydown', function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                onClick.call(this);
            }
          });

          if (cell.getAttribute('data-sort-default') !== null) {
            defaultSort = cell;
          }
        }
      }

      if (defaultSort) {
        that.current = defaultSort;
        that.sortTable(defaultSort);
      }
    },

    sortTable: function(header, update) {
      var that = this,
          columnKey = header.getAttribute('data-sort-column-key'),
          column = header.cellIndex,
          sortFunction = caseInsensitiveSort,
          item = '',
          items = [],
          i = that.thead ? 0 : 1,
          sortMethod = header.getAttribute('data-sort-method'),
          sortReverse = header.hasAttribute('data-sort-reverse'),
          sortOrder = header.getAttribute('aria-sort');

      that.table.dispatchEvent(createEvent('beforeSort'));

      // If updating an existing sort, direction should remain unchanged.
      if (!update) {
        if (sortOrder === 'ascending') {
          sortOrder = 'descending';
        } else if (sortOrder === 'descending') {
          sortOrder = 'ascending';
        } else {
          sortOrder = !!that.options.descending != sortReverse ? 'descending' : 'ascending';
        }

        header.setAttribute('aria-sort', sortOrder);
      }

      if (that.table.rows.length < 2) return;

      // If we force a sort method, it is not necessary to check rows
      if (!sortMethod) {
        var cell;
        while (items.length < 3 && i < that.table.tBodies[0].rows.length) {
          if(columnKey) {
            cell = getCellByKey(that.table.tBodies[0].rows[i].cells, columnKey);
          } else {
            cell = that.table.tBodies[0].rows[i].cells[column];
          }

          // Treat missing cells as empty cells
          item = cell ? getInnerText(cell,that.options) : "";

          item = item.trim();

          if (item.length > 0) {
            items.push(item);
          }

          i++;
        }

        if (!items) return;
      }

      for (i = 0; i < sortOptions.length; i++) {
        item = sortOptions[i];

        if (sortMethod) {
          if (item.name === sortMethod) {
            sortFunction = item.sort;
            break;
          }
        } else if (items.every(item.pattern)) {
          sortFunction = item.sort;
          break;
        }
      }

      that.col = column;

      for (i = 0; i < that.table.tBodies.length; i++) {
        var newRows = [],
            noSorts = {},
            j,
            totalRows = 0,
            noSortsSoFar = 0;

        if (that.table.tBodies[i].rows.length < 2) continue;

        for (j = 0; j < that.table.tBodies[i].rows.length; j++) {
          var cell;

          item = that.table.tBodies[i].rows[j];
          if (item.getAttribute('data-sort-method') === 'none') {
            // keep no-sorts in separate list to be able to insert
            // them back at their original position later
            noSorts[totalRows] = item;
          } else {
            if (columnKey) {
              cell = getCellByKey(item.cells, columnKey);
            } else {
              cell = item.cells[that.col];
            }
            // Save the index for stable sorting
            newRows.push({
              tr: item,
              td: cell ? getInnerText(cell,that.options) : '',
              index: totalRows
            });
          }
          totalRows++;
        }
        // Before we append should we reverse the new array or not?
        // If we reverse, the sort needs to be `anti-stable` so that
        // the double negatives cancel out
        if (sortOrder === 'descending') {
          newRows.sort(stabilize(sortFunction, true));
        } else {
          newRows.sort(stabilize(sortFunction, false));
          newRows.reverse();
        }

        // append rows that already exist rather than creating new ones
        for (j = 0; j < totalRows; j++) {
          if (noSorts[j]) {
            // We have a no-sort row for this position, insert it here.
            item = noSorts[j];
            noSortsSoFar++;
          } else {
            item = newRows[j - noSortsSoFar].tr;
          }

          // appendChild(x) moves x if already present somewhere else in the DOM
          that.table.tBodies[i].appendChild(item);
        }
      }

      that.table.dispatchEvent(createEvent('afterSort'));
    },

    refresh: function() {
      if (this.current !== undefined) {
        this.sortTable(this.current, true);
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tablesort;
  } else {
    window.Tablesort = Tablesort;
  }
})();

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://tristen.ca/tablesort/tablesort.css';
document.head.appendChild(link);

