const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB;

async function run() {
  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db(dbName);

  const users = await db.collection('users').find({}).toArray();

  await client.close();

  // 🔑 VERY IMPORTANT
  return users;
}

module.exports = run();
