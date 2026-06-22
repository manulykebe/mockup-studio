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

        // Add click event to toggle collapse/expand
        const toggleCollapse = () => {
            const isCollapsed = contentWrapper.style.display === 'none';

            if (isCollapsed) {
                // Expand
                contentWrapper.style.display = 'block';
                icon.style.transform = 'rotate(90deg)';
            } else {
                // Collapse
                contentWrapper.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        };

        icon.addEventListener('click', toggleCollapse);
        h3.addEventListener('click', toggleCollapse);
    });
}


makeCollapsible()