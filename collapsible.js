/**
 * Makes H3 sections collapsible with expand/collapse icons
 * By default, sections are collapsed
 */
function makeCollapsible() {
    // Find all H3 elements
    const h3Elements = document.querySelectorAll('h3');

    h3Elements.forEach((h3) => {
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
}


makeCollapsible()