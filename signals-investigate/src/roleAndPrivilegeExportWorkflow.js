// Automates the multi-page role/privilege export: navigates through a fixed list of admin/config
// pages and runs extract.exportRolesToCsv()/extract.exportPrivilegesToCsv() on each. Progress is
// persisted in localStorage because every navigation reloads the page (and this script) from
// scratch, and this script re-runs its resume check every time it is (re)injected.

const STORAGE_KEY = 'signals-investigate:roleAndPrivilegeExportWorkflow';

const WORKFLOW_STEPS = [
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/roles?tab=administration', action: 'roles' },
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/objects/experiment/privileges', action: 'privileges' },
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/objects/ado/privileges?id=10', action: 'privileges' },
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/objects/ado/privileges?id=11', action: 'privileges' },
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/objects/sample/privileges', action: 'privileges' },
  { url: 'https://devinternal.srppvt4s3r.revvitycloud.eu/snconfig/objects/notebook/privileges', action: 'privileges' },
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

// Ignores hash so re-navigations to the same target URL are recognized as a match.
function sameUrl(a, b) {
  const normalize = (value) => value.replace(/#.*$/, '').replace(/\/$/, '');
  return normalize(a) === normalize(b);
}

async function runStepAction(action) {
  if (action === 'roles') {
    return window.extract.exportRolesToCsv();
  }
  if (action === 'privileges') {
    return window.extract.exportPrivilegesToCsv();
  }
  throw new Error(`Unknown role/privilege export workflow action "${action}".`);
}

async function advanceWorkflow(state) {
  const step = WORKFLOW_STEPS[state.stepIndex];

  if (!sameUrl(window.location.href, step.url)) {
    console.log(`Role/privilege export workflow: navigating to step ${state.stepIndex + 1}/${WORKFLOW_STEPS.length} (${step.url}).`);
    window.location.href = step.url;
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
  window.location.href = WORKFLOW_STEPS[nextIndex].url;
}

// Starts the workflow from the console, e.g. extract.runRoleAndPrivilegeExportWorkflow().
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

// Call once window.extract is fully assigned so a workflow left in progress by the previous
// page load continues automatically, without needing the console call again.
function resumeRoleAndPrivilegeExportWorkflowIfPending() {
  const state = loadState();
  if (!state) {
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
