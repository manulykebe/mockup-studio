/** Extracts parent/child names from a `.binder__toc` tree. */
export function extractTocData(root) {
  const toc = root.querySelector('.binder__toc');
  if (!toc) {
    throw new Error('No .binder__toc element found on the page.');
  }

  // Each direct child of .binder__toc that owns a .binder__toc-page is one "parent" group;
  // its .binder__toc-element children are nested inside the same group div.
  const groups = Array.from(toc.children).filter((el) => el.querySelector('.binder__toc-page'));

  const rows = [];
  groups.forEach((group) => {
    const parentNameEl = group.querySelector('.binder__toc-page-name');
    const parentName = parentNameEl ? parentNameEl.textContent.trim() : '';

    const childNameEls = group.querySelectorAll('.binder__toc-element-name');
    if (childNameEls.length === 0) {
      rows.push([parentName, '']);
      return;
    }

    childNameEls.forEach((childEl) => {
      rows.push([parentName, childEl.textContent.trim()]);
    });
  });

  return rows;
}
