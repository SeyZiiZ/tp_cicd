const { MongoClient } = require('mongodb');

const {
  MONGO_HOST = 'mongo',
  MONGO_PORT = '27017',
  MONGO_DB = 'tpcicd',
  MONGO_USER,
  MONGO_PASSWORD,
} = process.env;

function buildUri() {
  const auth = MONGO_USER && MONGO_PASSWORD
    ? `${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD)}@`
    : '';
  return `mongodb://${auth}${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
}

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(buildUri(), {
    serverSelectionTimeoutMS: 3000,
  });
  await client.connect();
  db = client.db(MONGO_DB);
  return db;
}

async function ping() {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

async function close() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}

module.exports = { connect, ping, close };
