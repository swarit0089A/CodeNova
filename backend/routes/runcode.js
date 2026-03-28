const express = require('express');
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');
const docker = new Docker();
const router = express.Router();
const { auth } = require('../utils/authenticate');
const { getLanguageConfig, getLanguageExtension, isDockerLanguage } = require('../utils/languages');
const LOCAL_RUNNER_URL = process.env.LOCAL_RUNNER_URL || 'http://127.0.0.1:5052';

router.post('/', async (req, res) => {
  const { code, language, input } = req.body;

  try {
    const result = await executeCodeInDocker(language, code, input);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error during code execution:", error);
    const dockerUnavailable =
      error.message.includes('Access is denied') ||
      error.message.includes('connect') ||
      error.message.includes('pipe') ||
      error.message.includes('Docker');

    res.status(500).json({
      result: 'SERVER ERROR',
      log: dockerUnavailable
        ? 'Docker is unavailable. Start Docker Desktop and make sure the runner containers/images are available.'
        : 'Internal Server Error',
      error: dockerUnavailable
        ? 'The code runner could not reach Docker on this machine.'
        : 'Unexpected execution failure.',
    });
  }
});

async function executeCodeInDocker(language, code, input) {
  const codeDir = path.join(__dirname, '..', 'ide_submissions');
  if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
  }

  const languageConfig = getLanguageConfig(language);

  if (!languageConfig) {
    throw new Error('Unsupported language');
  }

  const codeFilePath = path.join(codeDir, `main.${getLanguageExtension(language)}`);
  const inputFilePath = path.join(codeDir, 'input.txt');
  const outputFilePath = path.join(codeDir, 'output.txt');
  const errorFilePath = path.join(codeDir, 'error.txt');

  fs.writeFileSync(codeFilePath, code);
  fs.writeFileSync(inputFilePath, input);
  fs.writeFileSync(outputFilePath, '');
  fs.writeFileSync(errorFilePath, '');

  try {
    if (isDockerLanguage(language)) {
      await executeInDocker(language, {
        codeFilePath,
        inputFilePath,
        outputFilePath,
        errorFilePath,
      });
    } else {
      await executeViaLocalRunner(language, code, input, {
        outputFilePath,
        errorFilePath,
      });
    }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) {
      throw error;
    }

    await executeViaLocalRunner(language, code, input, {
      outputFilePath,
      errorFilePath,
    });
  }

  const output = fs.readFileSync(outputFilePath, 'utf-8');
  const error = fs.readFileSync(errorFilePath, 'utf-8');

  if (error) {
    return {
      result: 'COMPILATION ERROR',
      log: 'Compilation or Runtime error occurred',
      error,
    };
  }

  return { result: 'SUCCESS', log: 'Code executed successfully', output: output.trim() };
}

function shouldUseLocalFallback(error) {
  const message = error?.message || '';

  return (
    message.includes('Access is denied') ||
    message.includes('connect') ||
    message.includes('pipe') ||
    message.includes('Docker') ||
    message.includes('ENOENT')
  );
}

async function executeViaLocalRunner(language, code, input, filePaths) {
  const { outputFilePath, errorFilePath } = filePaths;

  const response = await fetch(`${LOCAL_RUNNER_URL}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      language,
      input,
    }),
  });

  if (!response.ok) {
    throw new Error('Local runner service is unavailable');
  }

  const result = await response.json();
  fs.writeFileSync(outputFilePath, result.stdout || '');
  fs.writeFileSync(errorFilePath, result.stderr || result.error || '');
}

async function executeInDocker(language, filePaths) {
  const { codeFilePath, inputFilePath, outputFilePath, errorFilePath } = filePaths;
  const dockerConfig = getLanguageConfig(language)?.docker;

  if (!dockerConfig) {
    throw new Error('Unsupported language');
  }

  const container = await docker.createContainer({
    Image: dockerConfig.imageName,
    Cmd: ['sh', '-c', `${dockerConfig.entryPoint} < input.txt > output.txt 2> error.txt`],
    Tty: false,
    HostConfig: {
      Binds: [`${path.dirname(codeFilePath)}:/usr/src/app`],
    },
    WorkingDir: '/usr/src/app',
  });

  try {
    await container.start();

    const result = await container.wait();

    if (result.StatusCode !== 0) {
      const error = fs.readFileSync(errorFilePath, 'utf-8');
      return {
        result: 'RUNTIME ERROR',
        log: `Runtime error occurred or code took too long to execute`,
        error,
      };
    }
  } 
  catch (err) {
    if (err.message.includes('timeout')) {
      return {
        result: 'TIME LIMIT EXCEEDED',
        log: 'The code execution exceeded the time limit of 6 seconds',
      };
    }
    throw err;
  } 
  finally {
    await container.remove();
  }
}
module.exports = router;
