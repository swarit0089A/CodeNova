const path = require('path');
const { spawn } = require('child_process');

const LOCAL_RUNNER_URL = process.env.LOCAL_RUNNER_URL || 'http://127.0.0.1:5052';
const LOCAL_RUNNER_STARTUP_TIMEOUT_MS = 5000;
const LOCAL_RUNNER_HEALTH_RETRY_DELAY_MS = 250;

let localRunnerBootPromise = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLocalRunnerHealthUrl() {
  try {
    return new URL('/health', LOCAL_RUNNER_URL).toString();
  } catch (error) {
    return 'http://127.0.0.1:5052/health';
  }
}

function getLocalRunnerPort() {
  try {
    const parsed = new URL(LOCAL_RUNNER_URL);
    return parsed.port || '5052';
  } catch (error) {
    return '5052';
  }
}

function canAutostartLocalRunner() {
  try {
    const parsed = new URL(LOCAL_RUNNER_URL);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch (error) {
    return false;
  }
}

async function isLocalRunnerHealthy() {
  try {
    const response = await fetch(getLocalRunnerHealthUrl());
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForLocalRunnerReady(timeoutMs = LOCAL_RUNNER_STARTUP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isLocalRunnerHealthy()) {
      return true;
    }

    await delay(LOCAL_RUNNER_HEALTH_RETRY_DELAY_MS);
  }

  return isLocalRunnerHealthy();
}

function getPythonLaunchCandidates() {
  const configuredPython = process.env.LOCAL_RUNNER_PYTHON;

  const candidates = [];

  if (configuredPython) {
    candidates.push({ command: configuredPython, args: [] });
  }

  if (process.platform === 'win32') {
    candidates.push({ command: 'py', args: ['-3'] });
  }

  candidates.push({ command: 'python', args: [] });
  candidates.push({ command: 'python3', args: [] });

  return candidates;
}

async function spawnLocalRunnerProcess(command, args) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'local_runner.py');

  return new Promise((resolve) => {
    let settled = false;

    const child = spawn(command, [...args, scriptPath], {
      cwd: path.dirname(scriptPath),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        LOCAL_RUNNER_PORT: getLocalRunnerPort(),
      },
    });

    child.once('error', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });

    child.once('spawn', () => {
      child.unref();

      if (!settled) {
        settled = true;
        resolve(true);
      }
    });
  });
}

async function bootLocalRunner() {
  if (!canAutostartLocalRunner()) {
    return false;
  }

  for (const candidate of getPythonLaunchCandidates()) {
    const started = await spawnLocalRunnerProcess(candidate.command, candidate.args);

    if (!started) {
      continue;
    }

    const ready = await waitForLocalRunnerReady();

    if (ready) {
      console.log(`Local runner is available at ${LOCAL_RUNNER_URL}`);
      return true;
    }
  }

  return false;
}

async function ensureLocalRunnerAvailable() {
  if (await isLocalRunnerHealthy()) {
    return true;
  }

  if (!localRunnerBootPromise) {
    localRunnerBootPromise = bootLocalRunner().finally(() => {
      localRunnerBootPromise = null;
    });
  }

  return localRunnerBootPromise;
}

module.exports = {
  LOCAL_RUNNER_URL,
  ensureLocalRunnerAvailable,
  isLocalRunnerHealthy,
};
