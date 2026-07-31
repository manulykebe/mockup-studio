import { Group } from 'async-monitor.js';

/**
 * Runs `steps` as a single monitored async chain: each step only starts once the previous
 * one has settled, and any rejection aborts the remaining steps. Built on async-monitor.js
 * so future multi-step async workflows can reuse this same reliable chaining mechanism.
 */
export async function runChain(steps, options) {
  const group = new Group({ abortOnReject: true, ...options });
  const results = [];

  steps.forEach((step) => {
    group.addWatch(async () => {
      results.push(await step());
    });
  });

  await group.watchAll();
  return results;
}
