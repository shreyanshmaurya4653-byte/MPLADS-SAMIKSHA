const { getDb } = require('../config/database');
const db = getDb();

console.log('--- Sample 5 rows from works ---');
const sampleWorks = db.prepare('SELECT id, title, category, implementing_agency, sanctioned_amount, estimated_cost, expenditure, physical_progress, status, house_type, mp_name, state_id, district_id, constituency_id FROM works LIMIT 5').all();
console.log(JSON.stringify(sampleWorks, null, 2));

console.log('--- Sample 5 rows from risk_assessments ---');
const sampleRisks = db.prepare('SELECT * FROM risk_assessments LIMIT 5').all();
console.log(JSON.stringify(sampleRisks, null, 2));

console.log('--- Min and Max Amounts in works ---');
const stats = db.prepare('SELECT count(1) as total, sum(sanctioned_amount) as total_sanc, sum(expenditure) as total_exp, avg(physical_progress) as avg_prog FROM works').get();
console.log(stats);
