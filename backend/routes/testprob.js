const express = require('express');
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');
const docker = new Docker();
const router = express.Router();
const { auth } = require('../utils/authenticate');
const { getLanguageConfig, getLanguageExtension, isDockerLanguage } = require('../utils/languages');
const { LOCAL_RUNNER_URL, ensureLocalRunnerAvailable } = require('../utils/localRunner');

router.post('/', auth, async (req, res) => {
  const submission = req.body;
  const problem = await db.collection('problems').findOne({ title: submission.title });

  if (!problem) {
    return res.status(400).json({ result: 'PROBLEM NOT FOUND', log: 'The specified problem does not exist.' });
  }

  try {
    const result = await runTestcase(problem, submission);
    const submissionIndex = await db.collection('submissions').countDocuments() + 1;
    await db.collection('submissions').insertOne({
      username: submission.username,
      problemName: submission.title,
      status: result.result,
      log: result.log,
      output: result.output,
      error: result.error,
      submissionIndex
    });

    await db.collection('users').updateOne(
      { username: submission.username },
      { 
        $push: { 
          submissionDates: new Date().toISOString() 
        }
      },
      { 
        upsert: false
      }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error during code execution:", error);
    res.status(500).json({ result: 'SERVER ERROR', log: 'Internal Server Error' });
  }
});


async function runTestcase(problem, submission) {
  const submissionDir = path.join(__dirname, '..', 'submissions', submission.username);
  const languageConfig = getLanguageConfig(submission.language);

  if (!languageConfig) {
    return {
      result: 'UNSUPPORTED LANGUAGE',
      log: 'This language is not available in the judge yet.',
    };
  }

  if (problem.solveMode === 'workspace' || !Array.isArray(problem.testcase) || problem.testcase.length === 0) {
    return {
      result: 'WORKSPACE ONLY',
      log: 'This seeded practice problem is meant for the workspace flow and does not have hidden judge testcases yet.',
    };
  }

  if (!fs.existsSync(submissionDir)) {
    fs.mkdirSync(submissionDir, { recursive: true });
  }

  const codeFilePath = path.join(submissionDir, `main.${getLanguageExtension(submission.language)}`);
  const inputFilePath = path.join(submissionDir, 'input.txt');
  const outputFilePath = path.join(submissionDir, 'output.txt');
  const errorFilePath = path.join(submissionDir, 'error.txt');

  fs.writeFileSync(codeFilePath, submission.code);

  for (let i = 0; i < problem.testcase.length; i++) {
    const testcase = problem.testcase[i];

    fs.writeFileSync(inputFilePath, '');
    fs.writeFileSync(outputFilePath, '');
    fs.writeFileSync(errorFilePath, '');

    fs.writeFileSync(inputFilePath, testcase.input);

    await executeSubmission(submission.language, submission.code, testcase.input, {
      codeFilePath,
      inputFilePath,
      outputFilePath,
      errorFilePath
    });

    const output = fs.readFileSync(outputFilePath, 'utf-8');
    const error = fs.readFileSync(errorFilePath, 'utf-8');

    if (error) {
      return {
        result: 'COMPILATION ERROR',
        log: `Compilation error occurred at testcase ${i + 1}`,
        error,
      };
    }

    if (output.trim() !== testcase.output.trim()) {
      return {
        result: 'WRONG ANSWER',
        log: `Wrong answer at testcase ${i + 1}`,
        input: testcase.input,
        expectedOutput: testcase.output,
        actualOutput: output.trim(),
      };
    }
  }

  return { result: 'ACCEPTED', log: 'All test cases passed successfully', expectedOutput: problem.testcase[0].output, actualOutput: problem.testcase[0].output, input: problem.testcase[0].input };
}

async function executeInDocker(language, filePaths) {
  const { codeFilePath, inputFilePath, outputFilePath, errorFilePath } = filePaths;
  const dockerConfig = getLanguageConfig(language)?.docker;

  if (!dockerConfig) {
    throw new Error('Unsupported language');
  }

  const container = await docker.createContainer({
    Image: dockerConfig.imageName,
    Cmd: ['sh', '-c', `timeout 6 ${dockerConfig.entryPoint} < input.txt > output.txt 2> error.txt`],
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
  } catch (err) {
    if (err.message.includes('timeout')) {
      return {
        result: 'TIME LIMIT EXCEEDED',
        log: 'The code execution exceeded the time limit of 6 seconds',
      };
    }
    throw err;
  } finally {
    await container.remove();
  }
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
  const runnerReady = await ensureLocalRunnerAvailable();

  if (!runnerReady) {
    throw new Error('Local runner service is unavailable');
  }

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

async function executeSubmission(language, code, input, filePaths) {
  const { outputFilePath, errorFilePath } = filePaths;

  fs.writeFileSync(outputFilePath, '');
  fs.writeFileSync(errorFilePath, '');

  try {
    if (isDockerLanguage(language)) {
      await executeInDocker(language, filePaths);
    } else {
      await executeViaLocalRunner(language, code, input, filePaths);
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
}


module.exports = router;
