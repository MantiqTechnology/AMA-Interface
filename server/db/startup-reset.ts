const resetKey = Symbol.for('ama.scenario-reset');
type ResetGlobal = typeof globalThis & { [resetKey]?: Promise<void> };

export async function resetScenarioBaselineOnce(reset: () => Promise<void>) {
  const resetGlobal = globalThis as ResetGlobal;
  resetGlobal[resetKey] ??= reset();
  await resetGlobal[resetKey];
}
