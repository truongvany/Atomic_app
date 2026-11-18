import { Db, MongoClient } from 'mongodb';
import { config } from '../config.js';

const client = new MongoClient(config.MONGODB_URI);
let database: Db | null = null;

export async function getDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(config.MONGODB_DB);
  }
  return database;
}

export async function closeDatabase() {
  await client.close();
  database = null;
}
