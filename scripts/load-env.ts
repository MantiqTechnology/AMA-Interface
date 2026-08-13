export function loadLocalEnv() {
  try {
    process.loadEnvFile?.('.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
