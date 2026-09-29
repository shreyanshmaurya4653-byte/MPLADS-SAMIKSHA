const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { getDb, getSupabaseHealth } = require('./config/database');

const authRouter = require('./routes/auth');
const jurisdictionRouter = require('./routes/jurisdiction');
const worksRouter = require('./routes/works');
const risksRouter = require('./routes/risks');
const dashboardRouter = require('./routes/dashboard');
const alertsRouter = require('./routes/alerts');
const trendsRouter = require('./routes/trends');
const usersRouter = require('./routes/users');
const investigationsRouter = require('./routes/investigations');
const evidenceRouter = require('./routes/evidence');
const financeRouter = require('./routes/finance');
const predictionsRouter = require('./routes/predictions');
const auditLogsRouter = require('./routes/auditLogs');
const aiCopilotRouter = require('./routes/aiCopilot');

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (config.CORS_ORIGINS.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly permissive
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database connection on boot
try {
  const db = getDb();
  const count = db.prepare("SELECT count(1) as cnt FROM sqlite_master WHERE type='table'").get();
  console.log(`[DB] Connected to SQLite local cache (${count?.cnt || 0} active tables)`);

  // Verify Supabase PostgreSQL connection
  getSupabaseHealth().then(supa => {
    if (supa.connected) {
      console.log(`[DB] ✅ Connected to Supabase PostgreSQL: ${supa.host}`);
      console.log(`[DB] 📊 Supabase Stats: ${supa.stats.works} works, ${supa.stats.projects} projects, latency: ${supa.latencyMs}ms`);
    } else {
      console.warn(`[DB] ⚠️ Supabase notice: ${supa.error || supa.message}`);
    }
  }).catch(e => console.warn('[DB] Supabase health check exception:', e.message));
} catch (err) {
  console.error('[DB] Failed to connect to database:', err.message);
}

// Mount API Routers
const apiPrefix = config.API_V1_STR;
app.use(`${apiPrefix}/auth`, authRouter);
app.use(`${apiPrefix}/jurisdiction`, jurisdictionRouter);
app.use(`${apiPrefix}/works`, worksRouter);
app.use(`${apiPrefix}/risks`, risksRouter);
app.use(`${apiPrefix}/dashboard`, dashboardRouter);
app.use(`${apiPrefix}/alerts`, alertsRouter);
app.use(`${apiPrefix}/trends`, trendsRouter);
app.use(`${apiPrefix}/users`, usersRouter);
app.use(`${apiPrefix}/investigations`, investigationsRouter);
app.use(`${apiPrefix}/evidence`, evidenceRouter);
app.use(`${apiPrefix}/finance`, financeRouter);
app.use(`${apiPrefix}/predictions`, predictionsRouter);
app.use(`${apiPrefix}/audit-logs`, auditLogsRouter);
app.use(`${apiPrefix}/ai-copilot`, aiCopilotRouter);

// Supabase Database health endpoint
app.get(`${apiPrefix}/database/status`, async (req, res) => {
  try {
    const health = await getSupabaseHealth();
    res.json(health);
  } catch (e) {
    res.status(500).json({ connected: false, error: e.message });
  }
});

// Root and health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: config.PROJECT_NAME,
    runtime: "Node.js (JavaScript Express)",
    database: "Supabase PostgreSQL (AWS ap-northeast-1)",
    version: "1.0.0"
  });
});

app.get('/health', (req, res) => {
  res.json({ status: "healthy", runtime: "node", database: "supabase-postgresql" });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    detail: err.message || "Internal Server Error"
  });
});

// Start Server
if (require.main === module) {
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 MPLADS AI Monitoring Node.js Backend`);
    console.log(`📡 Server listening on http://0.0.0.0:${config.PORT} (http://localhost:${config.PORT})`);
    console.log(`🔗 API Base: http://localhost:${config.PORT}${apiPrefix}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
