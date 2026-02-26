const { spawn } = require('child_process');
const path = require('path');

const MAX_ATTEMPTS = Number(process.env.PRISMA_MIGRATE_RETRIES || 5);
const BASE_DELAY_MS = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || 5000);
const API_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join('prisma', 'schema.prisma');

function runMigrateDeploy() {
  return new Promise((resolve) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'migrate', 'deploy', '--schema', SCHEMA_PATH],
      { stdio: 'inherit', shell: false, env: process.env, cwd: API_ROOT },
    );

    child.on('close', (code) => resolve(code || 0));
    child.on('error', () => resolve(1));
  });
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const code = await runMigrateDeploy();
    if (code === 0) {
      process.exit(0);
    }

    if (attempt === MAX_ATTEMPTS) {
      process.exit(code);
    }

    const delay = BASE_DELAY_MS * attempt;
    console.log(`prisma migrate deploy failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));
  }
}

main().catch(() => process.exit(1));
