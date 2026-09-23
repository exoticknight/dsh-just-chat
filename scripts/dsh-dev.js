import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dshHome = path.join(projectRoot, '.dsh-dev');
const dshBin = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const archivePlugin = '@michengai/dsh-archive-manager@0.1.41';
const commandEnv = { ...process.env, DSH_HOME: dshHome };

function installDependencies() {
  return new Promise((resolve, reject) => {
    // Execa is installed by this command, so bootstrap pnpm through Node's platform shell first.
    const child = spawn('pnpm install --frozen-lockfile', {
      cwd: projectRoot,
      env: commandEnv,
      shell: true,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(signal
          ? `Project dependency installation was interrupted by ${signal}.`
          : `Project dependency installation failed with exit code ${code}.`));
      }
    });
  });
}

function createRunner(execa) {
  return (command, args) => execa(command, args, {
    cwd: projectRoot,
    env: commandEnv,
    stdio: 'inherit',
  });
}

async function ensureDshCli() {
  try {
    await access(dshBin);
  } catch {
    throw new Error(`Project-local DSH CLI was not installed: ${dshBin}`);
  }
}

async function installDshDev() {
  await installDependencies();

  const { execa } = await import('execa');
  const run = createRunner(execa);
  await ensureDshCli();
  await mkdir(dshHome, { recursive: true });

  await run(process.execPath, [dshBin, 'plugin', '--profile', 'web', 'add', '.']);
  // Dev companion only: do not add archive management to the published bundle.
  await run(process.execPath, [
    dshBin,
    'plugin',
    '--profile',
    'web',
    'add',
    archivePlugin,
    '--registry=https://registry.npmjs.org/',
  ]);

  console.log(`DSH development Home ready: ${dshHome}`);
  return run;
}

async function startDshDev() {
  const run = await installDshDev();
  await run(process.execPath, [dshBin, '--profile', 'web', '--no-open', '--port', '0']);
}

const actions = { install: installDshDev, start: startDshDev };
const action = process.argv[2];

if (!actions[action]) {
  console.error('Usage: node scripts/dsh-dev.js <install|start>');
  process.exitCode = 1;
} else {
  try {
    await actions[action]();
  } catch (error) {
    console.error(error.shortMessage ?? error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
