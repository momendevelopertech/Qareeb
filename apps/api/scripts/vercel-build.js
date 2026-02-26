const { spawn } = require('child_process');
const path = require('path');

const API_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join('prisma', 'schema.prisma');
const MAX_ATTEMPTS = Number(process.env.PRISMA_MIGRATE_RETRIES || 5);
const BASE_DELAY_MS = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || 5000);

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: API_ROOT,
      env,
      shell: false,
    });
    child.on('close', (code) => resolve(code || 0));
    child.on('error', () => resolve(1));
  });
}

async function runMigrateWithRetry(env) {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const code = await run(bin, ['prisma', 'migrate', 'deploy', '--schema', SCHEMA_PATH], env);
    if (code === 0) return 0;
    if (attempt === MAX_ATTEMPTS) return code;
    const delay = BASE_DELAY_MS * attempt;
    console.log(`prisma migrate deploy failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));
  }
  return 1;
}

async function main() {
  const env = { ...process.env };
  if (!env.DIRECT_URL && env.DATABASE_URL) {
    env.DIRECT_URL = env.DATABASE_URL;
    console.log('DIRECT_URL is missing, fallback to DATABASE_URL for build.');
  }

  let code = await runMigrateWithRetry(env);
  if (code !== 0) process.exit(code);

  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  code = await run(bin, ['prisma', 'generate', '--schema', SCHEMA_PATH], env);
  if (code !== 0) process.exit(code);

  const nestBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  code = await run(nestBin, ['nest', 'build'], env);
  process.exit(code);
}

main().catch(() => process.exit(1));
