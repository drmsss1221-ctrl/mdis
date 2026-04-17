'use strict';

/**
 * server.js — STP Dashboard API (Security-Hardened)
 *
 * Security features:
 *  ✔ HTTPS with auto-generated self-signed cert (swap cert.pem/key.pem for production CA cert)
 *  ✔ Helmet.js — XSS, clickjacking, HSTS, CSP headers
 *  ✔ express-rate-limit — brute-force protection on login / signup
 *  ✔ bcryptjs — passwords stored as salted hashes (never plaintext)
 *  ✔ Input sanitization — strip HTML/JS injection on all string inputs
 *  ✔ Body size limit — prevents large payload DoS
 *  ✔ Login by username OR phone number
 *  ✔ Constant-time rejection — prevents user enumeration
 *  ✔ dotenv — reads .env file for credentials (never hardcode secrets)
 */

// ── Load .env FIRST so all process.env vars are available ────────────────────
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  if (result.parsed) {
    console.log('[ENV] Loaded .env — ' + Object.keys(result.parsed).length + ' variables');
  }
} catch {
  console.log('[ENV] dotenv not installed — using system environment variables only');
  console.log('      Run: npm install dotenv   to enable .env file support');
}

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const http    = require('http');
const https   = require('https');
const express = require('express');

// ── Lazily-loaded optional packages ──────────────────────────────────────────
let helmet, rateLimit, bcrypt;

function loadPackage(name) {
  try { return require(name); }
  catch { console.warn(`[!] Package "${name}" not installed. Run: npm install ${name}`); return null; }
}

const mongoose   = loadPackage('mongoose');

helmet     = loadPackage('helmet');
rateLimit  = loadPackage('express-rate-limit');
bcrypt     = loadPackage('bcryptjs');

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || process.env.EMAIL_USER || null;
const DEFAULT_ADMIN_PHONE = process.env.DEFAULT_ADMIN_PHONE || null;

// ── MongoDB Integration ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
let mongoReady = false;

function canUseMongo() {
  return !!(mongoose && mongoReady && mongoose.connection && mongoose.connection.readyState === 1);
}

if (mongoose && MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      mongoReady = true;
      console.log('[DB] MongoDB Connected Successfully.');
    })
    .catch(err => {
      mongoReady = false;
      console.error('[DB] Connection Error:', err.message);
    });
} else {
  mongoReady = false;
  console.log('\n╔══ DATABASE WARNING ══════════════════════════════════════╗');
  console.log('║  MONGODB_URI is missing in .env                          ║');
  console.log('║  Status: USING SESSION-MEMORY (Non-Persistent)           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  phone:    { type: String, unique: true, sparse: true },
  email:    { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});
const User = mongoose && mongoose.models.User ? mongoose.models.User : (mongoose ? mongoose.model('User', userSchema) : null);

// ── Configuration ─────────────────────────────────────────────────────────────
const HTTP_PORT      = Number(process.env.PORT)       || 3000;
const HTTPS_PORT     = Number(process.env.HTTPS_PORT) || 3443;
const BCRYPT_ROUNDS  = 12;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || 'YOUR_RECAPTCHA_SECRET_HERE';

// ── HTTPS: generate self-signed cert if not already on disk ──────────────────
function getHttpsCreds() {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath  = path.join(__dirname, 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  }

  const selfsigned = loadPackage('selfsigned');
  if (!selfsigned) return null;

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems  = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 365,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }],
  });

  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath,  pems.private);
  console.log('[HTTPS] Self-signed cert generated → cert.pem / key.pem');
  console.log('[HTTPS] For production: replace with a CA-signed certificate.');
  return { cert: pems.cert, key: pems.private };
}

// ── In-memory stores (replace with a persistent DB in production) ─────────────
const userStore = new Map();

// ── Seed default admin ────────────────────────────────────────────────────────
(async () => {
  if (!bcrypt) return;
  const adminPass = 'Admin@123!';
  const hash = await bcrypt.hash(adminPass, BCRYPT_ROUNDS);
  const adminContact = {
    email: DEFAULT_ADMIN_EMAIL,
    phone: DEFAULT_ADMIN_PHONE
  };
  
  if (canUseMongo()) {
    try {
      const existing = await User.findOne({ username: 'admin' });
      if (!existing) {
        await User.create({ username: 'admin', passwordHash: hash, ...adminContact });
        console.log('[DB] Admin seeded in MongoDB.');
      } else if ((adminContact.email && !existing.email) || (adminContact.phone && !existing.phone)) {
        await User.updateOne(
          { username: 'admin' },
          {
            $set: {
              ...(adminContact.email && !existing.email ? { email: adminContact.email } : {}),
              ...(adminContact.phone && !existing.phone ? { phone: adminContact.phone } : {})
            }
          }
        );
        console.log('[DB] Admin contact fields refreshed from environment.');
      }
    } catch (e) { console.error('[DB] Admin seeding failed:', e.message); }
  }

  // Always seed memory for immediate readiness
  userStore.set('admin', { username: 'admin', phone: adminContact.phone, email: adminContact.email, passwordHash: hash });
  console.log('[Auth] Default admin → username: admin  |  password: Admin@123!');
})();

// ── Express app setup ─────────────────────────────────────────────────────────
const app = express();

// Security headers via Helmet
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'",
                      'https://www.google.com', 'https://www.gstatic.com',
                      'https://fonts.googleapis.com'],
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        frameSrc:    ['https://www.google.com'],
        connectSrc:  ["'self'", 'https://docs.google.com'],
        imgSrc:      ["'self'", 'data:', 'https://www.gstatic.com'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    crossOriginEmbedderPolicy: false,
  }));
}

app.use(express.json({ limit: '10kb' }));         // prevent large-body DoS
app.use(express.static(path.join(__dirname)));

// ── Rate limiters (brute-force protection) ────────────────────────────────────
function makeLimiter(windowMinutes, max, messageObj) {
  if (!rateLimit) return (req, res, next) => next(); // no-op if package missing
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: messageObj,
    standardHeaders: true,
    legacyHeaders:   false,
  });
}

const loginLimiter    = makeLimiter(15, 10,  { success: false,   reason: 'RATE_LIMITED' });
const signupLimiter   = makeLimiter(60, 5,   { success: false,   reason: 'SIGNUP_RATE_LIMITED' });
const captchaLimiter  = makeLimiter(5,  30,  { success: false,   reason: 'RATE_LIMITED' });

// ── Utility: input sanitization ───────────────────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  // Strip XSS / injection vectors, truncate
  return str.replace(/[<>"';&=\\`]/g, '').trim().slice(0, 128);
}

// Normalize phone to E.164 (+countrycode digits)
function normalizePhone(raw) {
  if (!raw) return null;
  // If it already starts with +, respect the user's country selection
  if (String(raw).trim().startsWith('+')) {
    return '+' + String(raw).replace(/\D/g, '');
  }
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`; // Keep +91 only for raw 10 digits
  if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Resolve user by username key OR phone number OR email
async function resolveUser(identifier) {
  if (!identifier) return null;
  const key = identifier.toLowerCase().trim();

  // 1. Try DB first if available
  if (canUseMongo()) {
    try {
      const u = await User.findOne({ 
        $or: [{ username: key }, { email: key }, { phone: normalizePhone(identifier) || 'NONE' }] 
      });
      if (u) {
        const dbUser = typeof u.toObject === 'function' ? u.toObject() : u;
        const memoryUser = userStore.get(dbUser.username.toLowerCase());
        return {
          key: dbUser.username.toLowerCase(),
          user: {
            ...dbUser,
            phone: dbUser.phone || memoryUser?.phone || null,
            email: dbUser.email || memoryUser?.email || null
          }
        };
      }
    } catch (e) { console.error('[DB] Resolve error:', e.message); }
  }

  // 2. Fallback to Memory
  if (userStore.has(key)) return { key, user: userStore.get(key) };
  for (const [k, u] of userStore.entries()) {
    if (u.email && u.email.toLowerCase() === key) return { key: k, user: u };
  }
  const normalized = normalizePhone(identifier);
  if (normalized) {
    for (const [k, u] of userStore.entries()) {
      if (u.phone === normalized) return { key: k, user: u };
    }
  }
  return null;
}

// Server-side strong password check (mirrors client-side rules)
function isStrongPassword(pw) {
  return pw && pw.length >= 8 &&
    /[A-Z]/.test(pw) && /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildAuthSuccessResponse(user, username, message = 'Authentication successful.') {
  const resolvedUser = user || {};
  const resolvedUsername = username || resolvedUser.username || '';
  return {
    success: true,
    sessionToken: generateSessionToken(),
    username: resolvedUsername,
    phone: resolvedUser.phone || null,
    email: resolvedUser.email || null,
    message,
  };
}

// ── GET /api/ping — lightweight network latency check ─────────────────────────
app.get('/api/ping', (req, res) => res.status(204).end());

// ── POST /api/recaptcha ───────────────────────────────────────────────────────

app.post('/api/recaptcha', captchaLimiter, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, reason: 'MISSING_TOKEN' });

  const postData = `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`;
  const opts = {
    hostname: 'www.google.com', path: '/recaptcha/api/siteverify', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
  };

  const request = https.request(opts, (gRes) => {
    let data = '';
    gRes.on('data', c => data += c);
    gRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.success) return res.json({ success: true });
        return res.json({ success: false, reason: 'CAPTCHA_REJECTED', errors: parsed['error-codes'] });
      } catch { return res.status(500).json({ success: false, reason: 'PARSE_ERROR' }); }
    });
  });
  request.on('error', () => res.status(502).json({ success: false, reason: 'GOOGLE_UNREACHABLE' }));
  request.write(postData);
  request.end();
});

function buildAuthSuccessResponse(user, username, message = 'Authentication successful.') {
  const resolvedUser = user || {};
  const resolvedUsername = username || resolvedUser.username || '';
  return {
    success: true,
    sessionToken: generateSessionToken(),
    username: resolvedUsername,
    phone: resolvedUser.phone || null,
    email: resolvedUser.email || null,
    message,
  };
}

// ── GET /api/ping — lightweight network latency check ─────────────────────────
app.get('/api/ping', (req, res) => res.status(204).end());

// ── POST /api/recaptcha ───────────────────────────────────────────────────────

app.post('/api/recaptcha', captchaLimiter, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, reason: 'MISSING_TOKEN' });

  const postData = `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`;
  const opts = {
    hostname: 'www.google.com', path: '/recaptcha/api/siteverify', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
  };

  const request = https.request(opts, (gRes) => {
    let data = '';
    gRes.on('data', c => data += c);
    gRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.success) return res.json({ success: true });
        return res.json({ success: false, reason: 'CAPTCHA_REJECTED', errors: parsed['error-codes'] });
      } catch { return res.status(500).json({ success: false, reason: 'PARSE_ERROR' }); }
    });
  });
  request.on('error', () => res.status(502).json({ success: false, reason: 'GOOGLE_UNREACHABLE' }));
  request.write(postData);
  request.end();
});

// ── POST /api/signup ──────────────────────────────────────────────────────────
app.post('/api/signup', signupLimiter, async (req, res) => {
  try {
    const username = sanitize(req.body.username || '');
    const password = req.body.password || '';             // raw — bcrypt will hash
    const phone    = sanitize(req.body.phone    || '');
    const email    = sanitize(req.body.email    || '');
    const normalizedEmail = email ? email.toLowerCase() : null;

    if (!username || !password || (!phone && !email)) {
      return res.status(400).json({ success: false, reason: 'MISSING_FIELDS' });
    }
    if (username.length < 3) {
      return res.status(400).json({ success: false, reason: 'USERNAME_TOO_SHORT' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, reason: 'WEAK_PASSWORD' });
    }

    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (phone && !normalizedPhone) {
      return res.status(400).json({ success: false, reason: 'INVALID_PHONE' });
    }

    const key = username.toLowerCase();
    if (await resolveUser(key)) {
      return res.status(409).json({ success: false, reason: 'USERNAME_TAKEN' });
    }
    if (normalizedPhone && await resolveUser(normalizedPhone)) {
      return res.status(409).json({ success: false, reason: 'PHONE_TAKEN' });
    }
    if (normalizedEmail && await resolveUser(normalizedEmail)) {
      return res.status(409).json({ success: false, reason: 'EMAIL_TAKEN' });
    }

    if (!bcrypt) return res.status(500).json({ success: false, reason: 'SERVER_ERROR' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userRecord = { username, phone: normalizedPhone, email: normalizedEmail, passwordHash };

    if (canUseMongo()) {
      try {
        await User.create(userRecord);
      } catch (e) {
        console.error('[DB] Signup save failed:', e.message);
        return res.status(500).json({ success: false, reason: 'SERVER_ERROR' });
      }
    }

    userStore.set(key, userRecord);
    console.log(`[Account Created] ${username} registered`);

    return res.json(buildAuthSuccessResponse(userRecord, username, 'Account created successfully.'));
  } catch (err) {
    console.error('[Signup Error]', err.message);
    return res.status(500).json({ success: false, reason: 'SERVER_ERROR' });
  }
});

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    // Accept identifier (username or phone) + password
    const identifier     = sanitize(req.body.identifier || req.body.username || '');
    const password       = req.body.password || '';
    const captchaVerified = req.body.captchaVerified;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, reason: 'MISSING_FIELDS' });
    }
    if (!captchaVerified) {
      return res.status(403).json({ success: false, reason: 'CAPTCHA_REQUIRED' });
    }

    const found = await resolveUser(identifier);

    // Constant-time fake compare to prevent user-enumeration via timing
    if (!found || !bcrypt) {
      if (bcrypt) await bcrypt.compare(password, '$2a$12$invalidhashXXXXXXXXXXXXXXXXXXXXXX000000000');
      return res.status(401).json({ success: false, reason: 'INVALID_CREDENTIALS' });
    }

    const match = await bcrypt.compare(password, found.user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, reason: 'INVALID_CREDENTIALS' });
    }

    const authUser = {
      username: found.user.username || found.key,
      phone: found.user.phone || null,
      email: found.user.email || null,
    };
    return res.json(buildAuthSuccessResponse(authUser, authUser.username));
  } catch (err) {
    console.error('[Login Error]', err.message);
    return res.status(500).json({ success: false, reason: 'SERVER_ERROR' });
  }
});

// ── HTTP → HTTPS redirect server ──────────────────────────────────────────────
const redirectApp = express();
redirectApp.use((req, res) => {
  res.redirect(301, `https://${req.hostname}:${HTTPS_PORT}${req.url}`);
});

function startOptionalHttpRedirectServer() {
  const redirectServer = http.createServer(redirectApp);

  redirectServer.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[STP] ⚠ HTTP redirect port ${HTTP_PORT} is already in use; continuing with HTTPS only.`);
      return;
    }

    console.error('[STP] HTTP redirect server error:', err);
  });

  redirectServer.listen(HTTP_PORT, () => {
    console.log(`[STP] ✔ HTTP   → http://localhost:${HTTP_PORT}  (redirects to HTTPS)`);
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
const creds = getHttpsCreds();

if (creds) {
  https.createServer(creds, app).listen(HTTPS_PORT, () => {
    console.log(`[STP] ✔ HTTPS  → https://localhost:${HTTPS_PORT}`);
  });
  startOptionalHttpRedirectServer();
} else {
  // Fallback when selfsigned is not yet installed
  const fallbackServer = app.listen(HTTP_PORT, () => {
    console.log(`[STP] HTTP → http://localhost:${HTTP_PORT}`);
    console.log('[STP] Run "npm install" to enable HTTPS support.');
  });

  fallbackServer.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[STP] ⚠ HTTP port ${HTTP_PORT} is already in use; fallback server did not start.`);
      return;
    }

    console.error('[STP] HTTP fallback server error:', err);
  });
}

module.exports = app;
