require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const app = express()
const port = process.env.PORT
const accessRoute = require('./routes/access');
const loginRoute = require('./routes/login');
const registerRoute = require('./routes/register');
const problemsRoute = require('./routes/problems');
const blogsRoute = require('./routes/blogs');
const problemRoute = require('./routes/problem');
const createProblemRoute = require('./routes/createproblem');
const createBlogRoute = require('./routes/createblog');
const testprobRoute = require('./routes/testprob');
const coderunner = require('./routes/runcode');
const submissionsRoute = require('./routes/submissions');
const notesRoute = require('./routes/notes');
const manageblogsRoute = require('./routes/manageblogs');
const getprofileRoute = require('./routes/getprofile');
const saveimgRoute = require('./routes/saveimage');
const uploadimgRoute = require('./routes/upload');
const getimgRoute = require('./routes/getimage');
const getdatesRoute = require('./routes/getdates')
const { MongoClient } = require('mongodb')
const { createLocalDb } = require('./utils/localdb')
const { seedPracticeProblems } = require('./utils/seedProblems')
const { ensureDockerComposeServices, DOCKER_SERVICES } = require('./utils/dockerCompose')
const { ensureLocalRunnerAvailable, LOCAL_RUNNER_URL } = require('./utils/localRunner')

const DEFAULT_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27018/codenovaDB'
const MONGO_URI = process.env.MONGODB_URI || DEFAULT_LOCAL_MONGO_URI
const MONGO_DB_NAME = resolveMongoDbName(MONGO_URI)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const WINDOWS_POWERSHELL_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
const FRONTEND_DIST_PATH = path.join(__dirname, '..', 'frontend', 'dist')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveMongoDbName(uri) {
  if (process.env.MONGODB_DB_NAME) {
    return process.env.MONGODB_DB_NAME;
  }

  if (!uri) {
    return 'CodeNova';
  }

  const uriWithoutQuery = uri.split('?')[0];
  const databaseName = uriWithoutQuery.slice(uriWithoutQuery.lastIndexOf('/') + 1).trim();

  return databaseName || 'CodeNova';
}

function canAutostartLocalMongo(uri) {
  if (process.platform !== 'win32') {
    return false;
  }

  if (!uri) {
    return false;
  }

  return uri.includes('127.0.0.1') || uri.includes('localhost');
}

function startLocalMongoProcess() {
  const startScriptPath = path.join(__dirname, 'scripts', 'start-local-mongo.ps1');
  const result = spawnSync(
    WINDOWS_POWERSHELL_PATH,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', startScriptPath],
    {
      windowsHide: true,
      stdio: 'pipe',
    }
  );

  if (result.status !== 0) {
    const stdout = result.stdout ? result.stdout.toString().trim() : '';
    const stderr = result.stderr ? result.stderr.toString().trim() : '';
    console.warn(`Failed to launch local mongod process automatically. ${stderr || stdout}`.trim());
    return false;
  }

  console.log('Started local MongoDB using the PowerShell helper');
  return true;
}

async function waitForMongoReady(createClient, attempts = 15, delayMs = 1000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = createClient();

    try {
      await client.connect();
      await client.db(MONGO_DB_NAME).command({ ping: 1 });
      return client;
    } catch (error) {
      await client.close().catch(() => {});

      if (attempt === attempts) {
        throw error;
      }

      await delay(delayMs);
    }
  }
}

async function connectMongoDB() {
  const createClient = () =>
    new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

  try {
    const client = await waitForMongoReady(createClient, 1);
    console.log('MongoDB connected');
    return client.db(MONGO_DB_NAME);
  } catch (error) {
    if (!canAutostartLocalMongo(MONGO_URI)) {
      throw error;
    }

    console.warn('MongoDB was unavailable. Trying to start a local MongoDB process...');
    const started = startLocalMongoProcess();

    if (!started) {
      throw error;
    }

    const client = await waitForMongoReady(createClient, 20, 1000);
    console.log('MongoDB connected after local startup');
    return client.db(MONGO_DB_NAME);
  }
}

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/access', accessRoute) 
app.use('/submissions', submissionsRoute) 
app.use('/runcode', coderunner)
app.use('/problems', problemsRoute)
app.use('/blogs', blogsRoute)
app.use('/login', loginRoute);
app.use('/register', registerRoute);
app.use('/problem', problemRoute);
app.use('/createproblem', createProblemRoute);
app.use('/createblog', createBlogRoute);
app.use('/testing', testprobRoute);
app.use('/notes', notesRoute)
app.use('/manageblogs', manageblogsRoute)

app.use('/getprofile', getprofileRoute)
app.use('/uploadurl', uploadimgRoute)
app.use('/saveimage', saveimgRoute)
app.use('/getimage', getimgRoute)
app.use('/getdates', getdatesRoute)

if (fs.existsSync(path.join(FRONTEND_DIST_PATH, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST_PATH));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
  });
}

const PORT = port || 8000;

async function startServer() {
  const dockerStartResult = ensureDockerComposeServices();

  if (dockerStartResult.success) {
    console.log(`Docker runner services are ready: ${DOCKER_SERVICES.join(', ')}`);
  } else if (!dockerStartResult.skipped) {
    console.warn(`Docker auto-start failed (${dockerStartResult.commandTried}). Falling back to the local runner when needed.`);
  }

  if (IS_PRODUCTION && !process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required in production. Configure a persistent MongoDB database before deploying.');
    process.exit(1);
  }

  try {
    const db = await connectMongoDB();
    global.db = db;
  } catch (error) {
    if (IS_PRODUCTION) {
      console.error('MongoDB connection failed in production:', error.message);
      process.exit(1);
    }

    console.error('MongoDB unavailable, falling back to local JSON storage:', error.message);
    global.db = createLocalDb();
  }

  try {
    const seedResult = await seedPracticeProblems(global.db);
    console.log(`Practice archive ready. Added ${seedResult.inserted} new seeded problems from a ${seedResult.totalCatalogSize}-problem catalog.`);
  } catch (error) {
    console.error('Unable to seed the practice archive:', error.message);
  }

  try {
    const runnerReady = await ensureLocalRunnerAvailable();

    if (!runnerReady) {
      console.warn(`Local runner could not be started automatically at ${LOCAL_RUNNER_URL}.`);
    }
  } catch (error) {
    console.warn(`Local runner startup check failed: ${error.message}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

module.exports = app;
