const http = require('node:http');
const app = require('./src/server');

const server = http.createServer(app);

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  await new Promise((resolve) => server.listen(8001, '127.0.0.1', resolve));
  console.log('🧪 Test server running on http://127.0.0.1:8001');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const h = await request({ host: '127.0.0.1', port: 8001, path: '/health', method: 'GET' });
    assert('Health Check', h.status === 200 && h.data.status === 'healthy');

    // 2. Auth: Login as MP
    const mpLogin = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'mp@mplads.gov.in', password: 'mp123' });
    assert('Auth: Login as MP', mpLogin.status === 200 && mpLogin.data.access_token);
    const mpToken = mpLogin.data.access_token;

    // 3. Auth: Login as District Officer
    const distLogin = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'district@mplads.gov.in', password: 'dist123' });
    assert('Auth: Login as District Officer', distLogin.status === 200 && distLogin.data.user.role === 'District');
    const distToken = distLogin.data.access_token;

    // 4. Auth: Login as Ministry Officer
    const minLogin = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'ministry@mplads.gov.in', password: 'min123' });
    assert('Auth: Login as Ministry Officer', minLogin.status === 200 && minLogin.data.user.role === 'Ministry');
    const minToken = minLogin.data.access_token;

    // 5. Jurisdiction: MP hierarchy (strictly scoped to their constituency)
    const mpHier = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/jurisdiction/hierarchy', method: 'GET',
      headers: { 'Authorization': `Bearer ${mpToken}` }
    });
    assert('Jurisdiction: MP Constituency Scoping', mpHier.status === 200 && mpHier.data.constituencies.length === 1);

    // 6. Jurisdiction: Ministry hierarchy (Pan-India)
    const minHier = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/jurisdiction/hierarchy', method: 'GET',
      headers: { 'Authorization': `Bearer ${minToken}` }
    });
    assert('Jurisdiction: Ministry Pan-India Multi-state', minHier.status === 200 && minHier.data.states.length >= 4);

    // 7. Works list: MP sees only constituency works
    const mpWorks = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/works', method: 'GET',
      headers: { 'Authorization': `Bearer ${mpToken}` }
    });
    assert('Works: MP Scoped Works Query', mpWorks.status === 200 && Array.isArray(mpWorks.data));

    // 8. Works list: Ministry with MP Name search
    const mpSearch = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/works?mp_name=Rajesh', method: 'GET',
      headers: { 'Authorization': `Bearer ${minToken}` }
    });
    assert('Works: MP Name Search Filter', mpSearch.status === 200 && mpSearch.data.every(w => w.mp_name.includes('Rajesh')));

    // 9. Work details with AI risk dossier & similarity candidates
    const workDetail = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/works/P1001', method: 'GET'
    });
    assert('Works: Work Details & Risk Dossier', workDetail.status === 200 && workDetail.data.risk_dossier.risk_score !== undefined);

    // 10. Data Upload: MP role MUST be blocked with HTTP 403
    const mpUpload = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/works/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}` }
    }, {
      works: [{ title: 'Unauthorized MP Project', category: 'Roads', estimated_cost: 500000 }]
    });
    assert('Upload Security: MP Role Blocked (HTTP 403)', mpUpload.status === 403);

    // 11. Data Upload: District Officer is AUTHORIZED
    const distUpload = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/works/upload', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${distToken}` }
    }, {
      works: [{
        title: 'District Test Solar Facility',
        category: 'Renewable Energy',
        estimated_cost: 750000,
        sanctioned_amount: 750000,
        implementing_agency: 'District DRDA'
      }]
    });
    assert('Upload Authorized: District Officer Success', distUpload.status === 200 && distUpload.data.success === true);

    // 12. Risks: 4 Problem Statement Anomaly Pillars
    const anomalies = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/risks/anomalies/breakdown', method: 'GET',
      headers: { 'Authorization': `Bearer ${minToken}` }
    });
    assert('Risks: Problem Statement Anomaly Pillars',
      anomalies.status === 200 &&
      anomalies.data.expenditure_patterns &&
      anomalies.data.fund_utilization &&
      anomalies.data.cost_estimates &&
      anomalies.data.work_execution &&
      anomalies.data.project_similarity
    );

    // 13. Risks: All duplicate clusters & similarity comparator
    const pairs = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/risks/similarity/all-pairs', method: 'GET'
    });
    assert('Risks: Similarity All Pairs Cluster', pairs.status === 200 && Array.isArray(pairs.data));

    const compare = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/risks/similarity/compare?work_a=P1001&work_b=P1002', method: 'GET'
    });
    assert('Risks: Side-by-side Project Compare', compare.status === 200 && compare.data.similarity_audit);

    // 14. Risks: 28-Table database summary
    const dbSummary = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/risks/database/tables-summary', method: 'GET'
    });
    assert('Risks: 28+ Database Tables Summary', dbSummary.status === 200 && dbSummary.data.total_tables >= 28);

    // 15. Dashboard KPIs & Trends
    const stats = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/dashboard/stats', method: 'GET',
      headers: { 'Authorization': `Bearer ${minToken}` }
    });
    assert('Dashboard: KPIs & Utilization Rate', stats.status === 200 && stats.data.total_works > 0);

    // 16. Alerts List
    const alerts = await request({
      host: '127.0.0.1', port: 8001, path: '/api/v1/alerts', method: 'GET',
      headers: { 'Authorization': `Bearer ${minToken}` }
    });
    assert('Alerts: List Alerts', alerts.status === 200 && Array.isArray(alerts.data));

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n================================`);
    console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
