// Batch Geocoding Script using Node.js DatabaseSync
const { getDb } = require('../src/config/database');
const { resolveProjectCoordinates } = require('../src/services/geoResolutionService');

function runBatchGeocoding() {
  const db = getDb();
  console.log('[Geocode] Starting batch geocoding of works in database...');

  const unlocatedCount = db.prepare('SELECT count(1) as cnt FROM works WHERE latitude IS NULL').get().cnt;
  console.log(`[Geocode] Found ${unlocatedCount} works without coordinates.`);

  if (unlocatedCount === 0) {
    console.log('[Geocode] All works already have coordinates.');
    return;
  }

  // Fetch batch of 35,000 works
  const batchSize = 35000;
  const works = db.prepare(`
    SELECT w.id, w.title, w.subdivision, w.district_id, w.state_id, d.district_name, s.state_name
    FROM works w
    LEFT JOIN districts d ON w.district_id = d.district_id
    LEFT JOIN states s ON w.state_id = s.state_id
    WHERE w.latitude IS NULL
    LIMIT ?
  `).all(batchSize);

  console.log(`[Geocode] Processing batch of ${works.length} works...`);

  const updateStmt = db.prepare(`
    UPDATE works 
    SET latitude = ?, longitude = ?, location_address = ?, location_status = 'GEOCODED_AI_MODEL'
    WHERE id = ?
  `);

  const start = Date.now();
  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  for (const w of works) {
    const geo = resolveProjectCoordinates(
      w,
      { district_name: w.district_name },
      { state_name: w.state_name }
    );
    updateStmt.run(geo.latitude, geo.longitude, geo.location_address, w.id);
    count++;
  }
  db.exec('COMMIT;');
  console.log(`[Geocode] Successfully geocoded and saved ${count} works in ${Date.now() - start}ms.`);

  // Sample check
  const samples = db.prepare(`
    SELECT id, title, latitude, longitude, location_address, location_status 
    FROM works 
    WHERE latitude IS NOT NULL 
    LIMIT 3
  `).all();
  console.log('[Geocode] Verification samples:', samples);
}

runBatchGeocoding();
