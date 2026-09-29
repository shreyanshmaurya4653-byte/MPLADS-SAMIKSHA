const { getDb } = require('../config/database');
const db = getDb();

console.log('--- Distribution of state_id in works ---');
const statesDist = db.prepare('SELECT state_id, count(1) as cnt FROM works GROUP BY state_id ORDER BY cnt DESC LIMIT 10').all();
console.log(statesDist);

console.log('--- Sample work row ---');
const sampleWork = db.prepare('SELECT * FROM works LIMIT 1').get();
console.log(sampleWork);

console.log('--- Distribution of house_type in works ---');
const houseDist = db.prepare('SELECT house_type, count(1) as cnt FROM works GROUP BY house_type').all();
console.log(houseDist);

console.log('--- Distribution of status in works ---');
const statusDist = db.prepare('SELECT status, count(1) as cnt FROM works GROUP BY status').all();
console.log(statusDist);

console.log('--- Distribution of category in works ---');
const catDist = db.prepare('SELECT category, count(1) as cnt FROM works GROUP BY category').all();
console.log(catDist);

console.log('--- Distribution of risk_level in risk_assessments ---');
const riskDist = db.prepare('SELECT risk_level, count(1) as cnt FROM risk_assessments GROUP BY risk_level').all();
console.log(riskDist);
