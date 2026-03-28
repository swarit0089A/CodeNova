const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '.localdb');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const DEFAULT_DATA = {
  users: [],
  admins: [],
  problems: [],
  blogs: [],
  submissions: [],
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = raw ? JSON.parse(raw) : { ...DEFAULT_DATA };

  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!Array.isArray(parsed[key])) {
      parsed[key] = [];
    }
  }

  return parsed;
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeValue(value) {
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }

  return value;
}

function matchesQuery(document, query = {}) {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  if (Array.isArray(query.$or)) {
    return query.$or.some((condition) => matchesQuery(document, condition));
  }

  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return true;
    }

    const actual = document[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$exists' in expected) {
        return expected.$exists ? actual !== undefined : actual === undefined;
      }
    }

    return normalizeValue(actual) === normalizeValue(expected);
  });
}

class LocalCollection {
  constructor(name) {
    this.name = name;
  }

  find(query = {}) {
    return {
      toArray: async () => {
        const data = readStore();
        return data[this.name].filter((document) => matchesQuery(document, query));
      },
    };
  }

  async findOne(query = {}) {
    const data = readStore();
    return data[this.name].find((document) => matchesQuery(document, query)) || null;
  }

  async insertOne(document) {
    const data = readStore();
    const record = {
      _id: document._id || crypto.randomUUID(),
      ...document,
    };

    data[this.name].push(record);
    writeStore(data);

    return { acknowledged: true, insertedId: record._id };
  }

  async updateOne(filter, update = {}, options = {}) {
    const data = readStore();
    const index = data[this.name].findIndex((document) => matchesQuery(document, filter));

    if (index === -1) {
      if (options.upsert) {
        const newDocument = { _id: crypto.randomUUID(), ...filter };
        data[this.name].push(newDocument);
        writeStore(data);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }

      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }

    const target = data[this.name][index];

    if (update.$set) {
      Object.assign(target, update.$set);
    }

    if (update.$push) {
      for (const [field, value] of Object.entries(update.$push)) {
        if (!Array.isArray(target[field])) {
          target[field] = [];
        }

        target[field].push(value);
      }
    }

    data[this.name][index] = target;
    writeStore(data);

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  async countDocuments(query = {}) {
    const data = readStore();
    return data[this.name].filter((document) => matchesQuery(document, query)).length;
  }

  async deleteOne(filter = {}) {
    const data = readStore();
    const index = data[this.name].findIndex((document) => matchesQuery(document, filter));

    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }

    data[this.name].splice(index, 1);
    writeStore(data);
    return { acknowledged: true, deletedCount: 1 };
  }
}

function createLocalDb() {
  ensureStore();

  return {
    collection(name) {
      if (!DEFAULT_DATA[name]) {
        const data = readStore();
        data[name] = [];
        writeStore(data);
      }

      return new LocalCollection(name);
    },
  };
}

module.exports = {
  createLocalDb,
};
