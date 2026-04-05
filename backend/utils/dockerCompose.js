const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const DOCKER_COMPOSE_FILE = path.join(REPO_ROOT, 'docker-compose.yml');
const DOCKER_AUTOSTART_ENABLED = (process.env.DOCKER_COMPOSE_AUTOSTART || 'true').toLowerCase() !== 'false';
const DOCKER_SERVICES = (process.env.DOCKER_COMPOSE_SERVICES || 'cpp_docker python_docker')
  .split(/\s+/)
  .map((service) => service.trim())
  .filter(Boolean);
const SERVICE_IMAGE_MAP = {
  cpp_docker: 'codearena_cpp_docker',
  python_docker: 'codearena_python_docker',
};

function canAutostartDockerCompose() {
  return DOCKER_AUTOSTART_ENABLED && fs.existsSync(DOCKER_COMPOSE_FILE) && DOCKER_SERVICES.length > 0;
}

function runComposeCommand(command, args) {
  return spawnSync(command, args, {
    cwd: REPO_ROOT,
    windowsHide: true,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120000,
  });
}

function runDockerCommand(args) {
  return spawnSync('docker', args, {
    cwd: REPO_ROOT,
    windowsHide: true,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120000,
  });
}

function getAvailableComposeCommand() {
  const composeCandidates = [
    { command: 'docker', argsPrefix: ['compose'] },
    { command: 'docker-compose', argsPrefix: [] },
  ];

  for (const candidate of composeCandidates) {
    const versionArgs = [...candidate.argsPrefix, 'version'];
    const result = runComposeCommand(candidate.command, versionArgs);

    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  return null;
}

function dockerImageExists(service) {
  const imageName = SERVICE_IMAGE_MAP[service];

  if (!imageName) {
    return false;
  }

  const result = runDockerCommand(['image', 'inspect', imageName]);
  return !result.error && result.status === 0;
}

function buildMissingServices(composeCommand, missingServices) {
  if (missingServices.length === 0) {
    return { success: true };
  }

  const args = [...composeCommand.argsPrefix, 'build', ...missingServices];
  const result = runComposeCommand(composeCommand.command, args);

  if (!result.error && result.status === 0) {
    return { success: true };
  }

  return {
    success: false,
    command: `${composeCommand.command} ${args.join(' ')}`,
  };
}

function startComposeServices() {
  const composeCommand = getAvailableComposeCommand();

  if (!composeCommand) {
    return {
      success: false,
      commandTried: 'docker compose version or docker-compose version',
    };
  }

  const missingServices = DOCKER_SERVICES.filter((service) => !dockerImageExists(service));
  const buildResult = buildMissingServices(composeCommand, missingServices);

  if (!buildResult.success) {
    return {
      success: false,
      commandTried: buildResult.command,
    };
  }

  const upArgs = [...composeCommand.argsPrefix, 'up', '-d', ...DOCKER_SERVICES];
  const upResult = runComposeCommand(composeCommand.command, upArgs);

  if (!upResult.error && upResult.status === 0) {
    return {
      success: true,
      command: `${composeCommand.command} ${upArgs.join(' ')}`,
    };
  }

  return {
    success: false,
    commandTried: `${composeCommand.command} ${upArgs.join(' ')}`,
  };
}

function ensureDockerComposeServices() {
  if (!canAutostartDockerCompose()) {
    return {
      success: false,
      skipped: true,
    };
  }

  return startComposeServices();
}

module.exports = {
  DOCKER_SERVICES,
  ensureDockerComposeServices,
};
