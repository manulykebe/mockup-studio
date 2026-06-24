'use strict'; var loadJSList = loadJSList || [];
(function (l) {
  var n = function (a) { 0 < loadJSList.filter(function (d) { return 0 == d.s }).length ? requestAnimationFrame(function () { n(a) }) : void 0 !== a && "function" == typeof a && a() }, p = function (a, d) { var f = a.onload; a.onload = "function" != typeof a.onload ? d : function () { f && f(); d() } }, v = function (a, d, f) { loadJSList.splice(loadJSList.findIndex(function (g) { return g.src === a }), 1); m(a, d, f) }, m = function (a, d, f, g) {
    g = g || !1; let h = /\.min\.js$/, q = /\.js$/; "localhost" !== location.hostname || g || (a = a.replace(h, ".js")); "localhost" === location.hostname ||
      g || (a = a.replace(q, ".min.js").replace(".min.min.", ".min.")); var c = loadJSList.find(e => e.src === a.replace(h, ".js")); if (c) -1 != c.s && (1 === c.s ? d && "function" === typeof d && d() : d && "function" === typeof d && ((c = document.querySelector('script[src^="' + a + '?_"]')) || (c = document.querySelector('script[src="' + a + '"]')), c ? p(c, d) : alert("loading error: " + a))); else {
        c = 0 <= a.indexOf("?") ? "&" : "?"; var r = a + ("localhost" === document.location.host ? "" : c + "_=" + Date.now()), t = "script", w = "text/javascript", x = "src"; "css" == a.split("?").reverse()[0].split(".").reverse()[0] &&
          (t = "link", w = "text/css", x = "href"); c = l.document.getElementsByTagName("head")[0].getElementsByTagName("script"); var y = c[c.length - 1]; c = l.document.createElement(t); c.type = w; c[x] = r; "link" === t && (c.rel = "stylesheet"); var k = Math.random().toString(36).replace(/[^a-z0-9]+/g, ""); c.id = k; "boolean" === typeof d && (r = f, f = d, d = r); c.async = !f; y.parentNode.insertBefore(c, y.nextSibling); loadJSList.push({ id: c.id, src: a.replace(h, ".js"), s: 0, start: performance.now(), checkpoints: [1E3, 2E3, 5E3, 5E3] }); p(c, function () {
            var e = loadJSList.findIndex(b =>
              b.id === k); -1 < e && (loadJSList[e] = { s: 1, src: loadJSList[e].src, duration: parseInt(10 * (performance.now() - loadJSList[e].start)) / 10 }, document.getElementById(k).remove())
          }); d && "function" === typeof d && p(c, d); var z = function (e) {
            e = loadJSList.filter(b => 0 === b.s && Array.isArray(b.checkpoints) && 0 < b.checkpoints.length).filter(b => performance.now() - b.start > b.checkpoints[0]); 0 < e.length && e.forEach(b => {
              var u = !0; 2 === b.checkpoints.length && (u = !1); var A = u ? b.checkpoints.shift() : b.checkpoints[0]; console.log(`slow script loading detected ...${A /
                1E3}s...: ${b.src}.`); u || (b.checkpoints[0] += b.checkpoints[1])
            }); 0 < loadJSList.filter(b => 0 === b.s).length && requestAnimationFrame(z)
          }; z(); c.onerror = function () {
            if (a.match(h) && !g) { document.getElementById(k).remove(); console.warn("fallback", `will try to load the non-minified script of ${a}`); loadJSList.splice(loadJSList.findIndex(b => b.src === a.replace(h, ".js")), 1); var e = a.replace(h, ".js"); m(e, d, f, !0) } else a.match(q) && !g ? (document.getElementById(k).remove(), console.warn("warning", `will try to load the minified script of ${a}`),
              loadJSList.splice(loadJSList.findIndex(b => b.src === a.replace(h, ".js")), 1), e = a.replace(q, ".min.js"), m(e, d, f, !0)) : g && (document.getElementById(k).remove(), loadJSList.filter(b => b.src === a.replace(h, ".js")).forEach(b => _.merge(b, { s: -1, start: void 0 })), console.warn("kon benodigde script niet laden!\n" + a))
          }; return c
      }
  }; "undefined" !== typeof module ? (module.exports = m, module.exports = v, module.exports = n) : (l.loadJS = m, l.reLoadJS = v, l.loadJSReady = n)
})("undefined" !== typeof global ? global : this);


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
    document.getElementsByClassName('table table-zebra w-full')[0].id='MeasTable'
    document.getElementById('MeasTable').classList.remove('table')
    document.getElementById('MeasTable').classList.remove('table-zebra')
    document.getElementById('MeasTable').classList.remove('w-full')
    document.getElementById('MeasTable').classList.add('stripe')
    document.getElementById('MeasTable').classList.add('display')
    document.getElementById('MeasTable').classList.add('compact')
    // document.getElementById('MeasTable').classList.add('border-spacing-y-1') //tailwind needs to compile
    document.getElementById('MeasTable').style.borderCollapse = 'separate'
    document.getElementById('MeasTable').style.borderSpacing = '0px 4px'

    convertTable()
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


function convertTable() {
  loadJS('https://code.jquery.com/jquery-4.0.0.min.js')
  loadJS('https://cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css');

  const loadDataTable = () => {
    loadJS('https://cdn.datatables.net/2.3.8/js/dataTables.min.js');
  }

  const putToShadowDOM = () => {
    let targetDiv = document.getElementsByClassName('overflow-x-auto')[0];
    let table = document.getElementById('MeasTable')
    let shadow = targetDiv.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css';
    shadow.appendChild(link);
    shadow.appendChild(table);
    new DataTable(table);
  }

  setTimeout(loadDataTable, 500);
  setTimeout(putToShadowDOM, 1000);

}

