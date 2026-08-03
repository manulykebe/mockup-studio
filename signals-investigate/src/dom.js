/** Reads a form control's current value as a string: checkboxes -> TRUE/FALSE, selects -> selected option text. */
function controlValue(control) {
  if (!control) {
    return '';
  }
  if (control.tagName === 'SELECT') {
    return control.selectedOptions[0]?.textContent.trim() ?? '';
  }
  if (control.type === 'checkbox') {
    return control.checked ? 'TRUE' : 'FALSE';
  }
  return control.value ?? '';
}

// The "Edit <entity> Field" form's shape varies per field type (e.g. built-in fields lack "Multi Select"/
// "Default Value", disable "Field Label"), so controls are discovered generically via each <label>'s `for`
// (falling back to the nearest input/select in its containing `.mb-3`) instead of hard-coded per field.
/** Parses a field-edit form's labelled controls, plus its unlabelled trigger-event <select>, into [name, value] pairs. */
export function parseFieldEditForm(form) {
  const pairs = [];
  const seenNames = new Set();

  Array.from(form.querySelectorAll('label')).forEach((label) => {
    const name = label.textContent.replace(/\*/g, '').replace(/\(required\)/gi, '').replace(/\s+/g, ' ').trim();
    if (!name || seenNames.has(name)) {
      return;
    }

    let control = label.htmlFor ? form.querySelector(`#${CSS.escape(label.htmlFor)}`) : null;
    if (!control) {
      const scope = label.closest('.mb-3') || label.parentElement;
      control = scope?.querySelector('input, select');
    }
    if (!control) {
      return;
    }

    seenNames.add(name);
    pairs.push([name, controlValue(control)]);
  });

  // The "Required" trigger-event <select> (On Experiment Creation/Completion) has no associated <label>.
  const triggerSelect = form.querySelector('select.form-select');
  if (triggerSelect) {
    pairs.push(['Trigger Event', controlValue(triggerSelect)]);
  }

  return pairs;
}

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
