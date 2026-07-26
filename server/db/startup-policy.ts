type StartupResetEnv = {
  AMA_RESET_ON_STARTUP?: unknown;
  AMA_SKIP_STARTUP_RESET?: unknown;
};

export function shouldResetDemoDatabaseOnStartup(
  config: { demoMode?: unknown },
  env: StartupResetEnv = process.env as StartupResetEnv
) {
  return (
    String(config.demoMode) === 'true' &&
    env.AMA_RESET_ON_STARTUP === 'true' &&
    env.AMA_SKIP_STARTUP_RESET !== 'true'
  );
}
