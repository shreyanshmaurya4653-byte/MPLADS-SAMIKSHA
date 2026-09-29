require('dotenv').config();

const config = {
  PORT: process.env.PORT || 8000,
  PROJECT_NAME: "MPLADS AI Monitoring API",
  API_V1_STR: "/api/v1",
  SECRET_KEY: process.env.SECRET_KEY || "mplads-super-secure-secret-key-change-in-production-2026",
  JWT_EXPIRES_IN: "24h",
  CORS_ORIGINS: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]
};

module.exports = config;
