// server.js
// Updated backend: saves visitor photos to disk (uploads/) and returns public URLs.
// Supports either JSON (base64 `photo`) or multipart/form-data (`photoFile`) uploads.
//
// NOTE: install multer if you haven't:
//   npm install multer
//
// Save this file as server.js (replace existing). Keep db.js & migrations.sql as before.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { run, get, all } = require('./db');

const app = express();

// allow larger JSON payloads (we accept base64 images in JSON)
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));

// serve uploaded files
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

const PORT = parseInt(process.env.PORT || '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '300', 10);

const MIGRATIONS_FILE = path.join(__dirname, 'migrations.sql');

function pad(n) { return String(n).padStart(2, '0'); }

// multer setup (store original extension; unique filename)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

// JWT helpers
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Run migrations if migrations.sql exists (db.js may already do this; running twice is harmless)
async function applyMigrations() {
  try {
    if (fs.existsSync(MIGRATIONS_FILE)) {
      const sql = fs.readFileSync(MIGRATIONS_FILE, 'utf8');
      const statements = sql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await run(stmt);
      }
      console.log('Migrations applied');
    }
  } catch (err) {
    console.error('Failed to run migrations:', err.message || err);
    throw err;
  }
}

/* -----------------------------
  ROUTES
------------------------------*/

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

/* AUTH (register/login/OTP) - unchanged logic */
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username & password required' });

    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: 'username already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const created_at = new Date().toISOString();
    await run('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      id, username, password_hash, created_at
    ]);

    const token = signToken({ id, username });
    res.json({ id, username, token });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username & password required' });

    const user = await get('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    if (!user) return res.status(400).json({ error: 'invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) return res.status(400).json({ error: 'invalid credentials' });

    const token = signToken({ id: user.id, username: user.username });
    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// OTP dev
app.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const expires_at = now + OTP_TTL_SECONDS;
    const created_at = new Date().toISOString();

    await run(
      'INSERT INTO otps (id, phone, otp, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, phone, otp, expires_at, 0, created_at]
    );

    res.json({ message: 'OTP generated (DEV)', otp, expires_at });
  } catch (err) {
    console.error('send-otp error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'phone & otp required' });

    const now = Math.floor(Date.now() / 1000);
    const row = await get(
      'SELECT id, otp, expires_at, used FROM otps WHERE phone = ? ORDER BY created_at DESC LIMIT 1',
      [phone]
    );

    if (!row) return res.status(400).json({ error: 'no otp found' });
    if (row.used) return res.status(400).json({ error: 'otp already used' });
    if (now > row.expires_at) return res.status(400).json({ error: 'otp expired' });
    if (row.otp !== String(otp)) return res.status(400).json({ error: 'invalid otp' });

    await run('UPDATE otps SET used = 1 WHERE id = ?', [row.id]);

    let user = await get('SELECT id, username FROM users WHERE username = ?', [phone]);
    if (!user) {
      const id = uuidv4();
      const created_at = new Date().toISOString();
      await run('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)', [
        id,
        phone,
        '',
        created_at,
      ]);
      user = { id, username: phone };
    }

    const token = signToken({ id: user.id, username: user.username });
    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    console.error('verify-otp error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

/* -----------------------------
  VISITORS (photo handling saved to disk)
------------------------------*/

/**
 * Helper: save base64 image data URL to uploads directory.
 * Returns public URL path (e.g. /uploads/xxxx.jpg)
 */
async function saveBase64Image(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  // expected format: data:<mime>;base64,<data>
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const buffer = Buffer.from(b64, 'base64');
  let ext = '.jpg';
  if (mime === 'image/png') ext = '.png';
  else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
  else if (mime === 'image/webp') ext = '.webp';
  const filename = uuidv4() + ext;
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

/**
 * Create visitor endpoint supports:
 *  - multipart/form-data with a file field named "photoFile"
 *  - application/json with a "photo" base64 data URL string
 *
 * The endpoint will save the uploaded file (or base64) to disk and return a photo URL.
 */
app.post('/visitors', async (req, res) => {
  try {
    // handle multipart conditionally
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    if (contentType.startsWith('multipart/')) {
      // run multer to handle file
      await new Promise((resolve, reject) => {
        upload.single('photoFile')(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }

    // Now collect fields - for multipart, multer populated req.body & req.file
    // for JSON, express.json populated req.body
    const {
      name, phone, address, purpose, company, personToMeet, checkin_time
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name required' });

    let photoUrl = null;

    // 1) if multer file present
    if (req.file && req.file.filename) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body && typeof req.body.photo === 'string' && req.body.photo.startsWith('data:image')) {
      // 2) if base64 data URL provided
      const saved = await saveBase64Image(req.body.photo);
      photoUrl = saved;
    }

    const id = uuidv4();
    const checkin = checkin_time ? parseInt(checkin_time, 10) : Math.floor(Date.now() / 1000);
    // created_by requires auth; try to parse token (optional) to allow public checkins if token not provided
    let created_by = null;
    try {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        created_by = decoded.id;
      }
    } catch (e) {
      // ignore — allow created_by null for unauthenticated check-ins if desired
    }

    await run(
      'INSERT INTO visitors (id, name, phone, address, purpose, company, personToMeet, photo, checkin_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, phone || '', address || '', purpose || '', company || '', personToMeet || '', photoUrl || '', checkin, created_by]
    );

    // return full absolute URL for convenience to frontend
    const base = `${req.protocol}://${req.get('host')}`;
    const photoAbsolute = photoUrl ? (photoUrl.startsWith('http') ? photoUrl : base + photoUrl) : null;

    res.json({ id, name, phone, address, purpose, company, personToMeet, photo: photoAbsolute, checkin_time: checkin });
  } catch (err) {
    console.error('create visitor error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Checkout endpoint (no change)
app.post('/visitors/:id/checkout', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const checkout_time = Math.floor(Date.now() / 1000);
    await run('UPDATE visitors SET checkout_time = ? WHERE id = ?', [checkout_time, id]);
    res.json({ id, checkout_time });
  } catch (err) {
    console.error('checkout error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Get visitors - returns photo as absolute URL where possible
app.get('/visitors', authMiddleware, async (req, res) => {
  try {
    const from = parseInt(req.query.from || '0', 10);
    const to = parseInt(req.query.to || String(Math.floor(Date.now() / 1000)), 10);
    const rows = await all(
      'SELECT * FROM visitors WHERE checkin_time BETWEEN ? AND ? ORDER BY checkin_time DESC',
      [from, to]
    );
    const base = `${req.protocol}://${req.get('host')}`;
    const mapped = rows.map(r => {
      let photo = r.photo || null;
      if (photo && !photo.startsWith('http')) photo = base + photo;
      return { ...r, photo };
    });
    res.json(mapped);
  } catch (err) {
    console.error('get visitors error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

/* -----------------------------
  REPORTS (unchanged)
------------------------------*/

app.get('/reports/daily', authMiddleware, async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days || '7', 10)));
    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime() / 1000);
      const end = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime() / 1000);
      const r = await get('SELECT COUNT(*) as c FROM visitors WHERE checkin_time BETWEEN ? AND ?', [start, end]);
      result.push({ date: d.toISOString().slice(0, 10), count: r ? r.c : 0 });
    }
    res.json(result);
  } catch (err) {
    console.error('reports/daily error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/reports/monthly', authMiddleware, async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months || '6', 10)));
    const now = new Date();
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000);
      const end = Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000);
      const r = await get('SELECT COUNT(*) as c FROM visitors WHERE checkin_time BETWEEN ? AND ?', [start, end]);
      const label = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      result.push({ month: label, count: r ? r.c : 0 });
    }
    res.json(result);
  } catch (err) {
    console.error('reports/monthly error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

/* Start: run migrations then start server */
async function start() {
  try {
    await applyMigrations();
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`VMS backend listening on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} in use. Please stop the other process or set PORT env var.`);
      process.exit(1);
    } else {
      console.error('Server error', err);
    }
  });
}

start();
