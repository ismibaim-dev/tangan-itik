// Loaded before anything reads process.env, so a local .env file can supply config.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}
