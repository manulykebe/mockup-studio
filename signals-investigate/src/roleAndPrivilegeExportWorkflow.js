// Automates the multi-page role/privilege export: navigates through a fixed list of admin/config
// pages and runs signals.exportRolesToCsv()/signals.exportPrivilegesToCsv() on each. Progress is
// persisted in localStorage because every navigation reloads the page (and this script) from
// scratch, and this script re-runs its resume check every time it is (re)injected.
//
// Steps are relative to the current origin so the same workflow runs unmodified on any instance
// (devinternal, jnj-test, ...). ADO-backed objects (GxP Experiment, GxP Request, ...) don't have a
// fixed id per instance, so those steps are described by their System Object name instead of a
// path; the id is resolved by looking the object up on /snconfig/objects and cached per-hostname
// in localStorage so the lookup only happens once per instance.

import { waitForCondition } from './popup.js';

const STORAGE_KEY = 'signals-investigate:roleAndPrivilegeExportWorkflow';
const ADO_ID_CACHE_KEY = 'signals-investigate:adoObjectIdCache';
const SYSTEM_OBJECTS_PATH = '/snconfig/objects';

const WORKFLOW_STEPS = [
  // { path: '/snconfig/users', action: 'user' },  
  { path: '/snconfig/roles?tab=administration', action: 'roles' },
  { path: '/snconfig/objects/experiment/privileges', action: 'privileges' },
  { adoObjectName: 'GxP Experiment', action: 'privileges' },
  { adoObjectName: 'GxP Request', action: 'privileges' },
  { path: '/snconfig/objects/sample/privileges', action: 'privileges' },
  { path: '/snconfig/objects/notebook/privileges', action: 'privileges' },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Role/privilege export workflow: failed to read saved progress, starting over.', error);
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// Caches resolved ADO object ids per hostname, since the same object name can map to a different
// id on every instance (devinternal, jnj-test, ...).
function loadAdoIdCache() {
  try {
    const raw = localStorage.getItem(ADO_ID_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Role/privilege export workflow: failed to read the System Object id cache, ignoring it.', error);
    return {};
  }
}

function getCachedAdoId(objectName) {
  const cache = loadAdoIdCache();
  return cache[window.location.hostname]?.[objectName] ?? null;
}

function setCachedAdoId(objectName, id) {
  const cache = loadAdoIdCache();
  const host = window.location.hostname;
  cache[host] = { ...(cache[host] || {}), [objectName]: id };
  localStorage.setItem(ADO_ID_CACHE_KEY, JSON.stringify(cache));
}

// Ignores hash so re-navigations to the same target URL are recognized as a match.
function sameUrl(a, b) {
  const normalize = (value) => value.replace(/#.*$/, '').replace(/\/$/, '');
  return normalize(a) === normalize(b);
}

function extractAdoIdFromUrl(url) {
  const match = url.match(/\/objects\/ado\/[a-z]+\?id=(\d+)/i);
  return match ? match[1] : null;
}

// Guards automatic resume-on-load: only true when the current page is actually part of the
// pending workflow (its next step's target page, the System Objects lookup page, or an ado id
// page reached mid-lookup), so a stale/stuck state never forces navigation away from an unrelated
// page the user is simply browsing.
function shouldResumeOnCurrentPage(state) {
  const step = WORKFLOW_STEPS[state.stepIndex];
  if (!step) {
    return false;
  }

  if (state.lookup) {
    const objectsUrl = `${window.location.origin}${SYSTEM_OBJECTS_PATH}`;
    return sameUrl(window.location.href, objectsUrl) || !!extractAdoIdFromUrl(window.location.href);
  }

  if (step.adoObjectName && !getCachedAdoId(step.adoObjectName)) {
    return sameUrl(window.location.href, `${window.location.origin}${SYSTEM_OBJECTS_PATH}`);
  }

  try {
    return sameUrl(window.location.href, getStepUrl(step));
  } catch {
    return false;
  }
}

// Finds the System Object card on /snconfig/objects whose heading text matches objectName exactly
// (case-insensitive); its ado id isn't available as a plain href, so it has to be read back from
// the URL after clicking it.
function findObjectCardHeading(objectName) {
  const headings = Array.from(document.querySelectorAll('h4'));
  return headings.find((h) => h.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === objectName.trim().toLowerCase()) || null;
}

function getStepUrl(step) {
  const origin = window.location.origin;
  if (step.path) {
    return `${origin}${step.path}`;
  }

  if (step.adoObjectName) {
    const id = getCachedAdoId(step.adoObjectName);
    if (!id) {
      throw new Error(`Role/privilege export workflow: missing resolved id for System Object "${step.adoObjectName}".`);
    }
    return `${origin}/snconfig/objects/ado/privileges?id=${id}`;
  }

  throw new Error('Role/privilege export workflow: step is missing a path or adoObjectName.');
}

async function runStepAction(action) {
  if (action === 'roles') {
    return window.signals.exportRolesToCsv();
  }
  if (action === 'privileges') {
    return window.signals.exportPrivilegesToCsv();
  }
  if (action === 'user') {
    return window.signals.exportUserToCsv();
  }
  throw new Error(`Unknown role/privilege export workflow action "${action}".`);
}

// Drives the (possibly multi-navigation) process of resolving objectName's ado id: lands on
// /snconfig/objects, clicks the matching System Object card, and reads the id back off the URL
// that navigation lands on. state.lookup survives the reload(s) this triggers via localStorage.
async function advanceAdoIdLookup(state, objectName) {
  const idFromCurrentUrl = extractAdoIdFromUrl(window.location.href);
  if (idFromCurrentUrl && state.lookup?.objectName === objectName) {
    console.log(`Role/privilege export workflow: resolved System Object "${objectName}" to id ${idFromCurrentUrl}.`);
    setCachedAdoId(objectName, idFromCurrentUrl);
    saveState({ stepIndex: state.stepIndex });
    await advanceWorkflow({ stepIndex: state.stepIndex });
    return;
  }

  const objectsUrl = `${window.location.origin}${SYSTEM_OBJECTS_PATH}`;
  if (!sameUrl(window.location.href, objectsUrl)) {
    saveState({ stepIndex: state.stepIndex, lookup: { objectName } });
    console.log(`Role/privilege export workflow: navigating to ${objectsUrl} to resolve the System Object id for "${objectName}".`);
    window.location.href = objectsUrl;
    return;
  }

  saveState({ stepIndex: state.stepIndex, lookup: { objectName } });
  const card = await waitForCondition(() => findObjectCardHeading(objectName), 15000);
  console.log(`Role/privilege export workflow: clicking System Object "${objectName}" to resolve its id.`);
  card.click();
}

async function advanceWorkflow(state) {
  const step = WORKFLOW_STEPS[state.stepIndex];

  if (step.adoObjectName && !getCachedAdoId(step.adoObjectName)) {
    await advanceAdoIdLookup(state, step.adoObjectName);
    return;
  }

  const targetUrl = getStepUrl(step);

  if (!sameUrl(window.location.href, targetUrl)) {
    console.log(`Role/privilege export workflow: navigating to step ${state.stepIndex + 1}/${WORKFLOW_STEPS.length} (${targetUrl}).`);
    window.location.href = targetUrl;
    return;
  }

  console.log(`Role/privilege export workflow: running step ${state.stepIndex + 1}/${WORKFLOW_STEPS.length} (${step.action}) on ${window.location.href}.`);

  try {
    await runStepAction(step.action);
  } catch (error) {
    console.error(`Role/privilege export workflow: step ${state.stepIndex + 1} failed, stopping.`, error);
    clearState();
    throw error;
  }

  const nextIndex = state.stepIndex + 1;
  if (nextIndex >= WORKFLOW_STEPS.length) {
    console.log('Role/privilege export workflow: all steps completed.');
    clearState();
    return;
  }

  saveState({ stepIndex: nextIndex });
  await advanceWorkflow({ stepIndex: nextIndex });
}

// Starts the workflow from the console, e.g. signals.runRoleAndPrivilegeExportWorkflow().
async function runRoleAndPrivilegeExportWorkflow() {
  const state = loadState() || { stepIndex: 0 };
  saveState(state);
  await advanceWorkflow(state);
}

// Clears any in-progress workflow, e.g. after a failure, so it can be restarted from step 1.
function resetRoleAndPrivilegeExportWorkflow() {
  clearState();
  console.log('Role/privilege export workflow: progress cleared.');
}

// Call once window.signals is fully assigned so a workflow left in progress by the previous
// page load continues automatically, without needing the console call again — but only while the
// current page is actually part of that pending workflow (see shouldResumeOnCurrentPage), so a
// stuck/stale state never hijacks navigation on an unrelated page.
function resumeRoleAndPrivilegeExportWorkflowIfPending() {
  const state = loadState();
  if (!state || !shouldResumeOnCurrentPage(state)) {
    return;
  }

  advanceWorkflow(state).catch((error) => {
    console.error('Role/privilege export workflow: failed to resume.', error);
  });
}

export {
  runRoleAndPrivilegeExportWorkflow,
  resetRoleAndPrivilegeExportWorkflow,
  resumeRoleAndPrivilegeExportWorkflowIfPending,
};
