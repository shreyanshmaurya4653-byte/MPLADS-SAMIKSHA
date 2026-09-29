const { getDb } = require('../config/database');
const db = getDb();
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('SQLite Tables:');
for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(1) as cnt FROM "${t.name}"`).get();
    console.log(`  ${t.name}: ${count.cnt} rows`);
  } catch(e) {
    console.log(`  ${t.name}: error ${e.message}`);
  }
}
