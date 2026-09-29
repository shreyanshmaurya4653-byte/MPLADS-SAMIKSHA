const jwt = require('jsonwebtoken');
const config = require('../config');

// Default development fallback user (Ministry oversight for full national visibility)
const FALLBACK_USER = {
  id: 1,
  name: "National Administrative Overseer",
  email: "admin@mplads.gov.in",
  role: "Ministry",
  state_id: 1,
  district_id: 1,
  constituency_id: 1
};

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Graceful fallback for seamless UI development
    req.user = FALLBACK_USER;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // 1. Support instant demo role token from frontend quick switcher
  if (token && token.startsWith('demo-')) {
    try {
      const decoded = JSON.parse(Buffer.from(token.slice(5), 'base64').toString('utf8'));
      req.user = {
        id: decoded.id || 1,
        name: decoded.name || 'Demo User',
        email: decoded.email || 'demo@mplads.gov.in',
        role: decoded.role || 'Ministry',
        state_id: decoded.state_id !== undefined ? Number(decoded.state_id) : 1,
        district_id: decoded.district_id !== undefined ? Number(decoded.district_id) : 1,
        constituency_id: decoded.constituency_id !== undefined ? Number(decoded.constituency_id) : 1,
        house_type: decoded.house_type || 'Lok Sabha'
      };
      return next();
    } catch (e) {
      // Fall through to regular JWT verification
    }
  }

  try {
    const decoded = jwt.verify(token, config.SECRET_KEY);
    req.user = {
      id: decoded.sub || decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      state_id: decoded.state_id !== undefined ? Number(decoded.state_id) : 1,
      district_id: decoded.district_id !== undefined ? Number(decoded.district_id) : 1,
      constituency_id: decoded.constituency_id !== undefined ? Number(decoded.constituency_id) : 1,
      house_type: decoded.house_type || 'Lok Sabha'
    };
    next();
  } catch (err) {
    // If token invalid, fallback gracefully to FALLBACK_USER rather than hard 401
    req.user = FALLBACK_USER;
    next();
  }
}

function createToken(user) {
  const payload = {
    sub: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    state_id: user.state_id,
    district_id: user.district_id,
    constituency_id: user.constituency_id
  };
  return jwt.sign(payload, config.SECRET_KEY, { expiresIn: config.JWT_EXPIRES_IN });
}

module.exports = {
  authMiddleware,
  createToken,
  FALLBACK_USER
};
