require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');


const app  = express();
const PORT = process.env.PORT || 5005;
const isProd = process.env.NODE_ENV === 'production';

const uploadPath = path.resolve(
  process.env.VERCEL === '1'
    ? '/tmp/uploads'
    : (process.env.UPLOAD_PATH || path.join(__dirname, 'uploads'))
);

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

if (isProd) {
  app.set('trust proxy', 1);
}

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];

const missingEnv = requiredEnv.filter(key => !process.env[key] || !process.env[key].trim());
if (missingEnv.length > 0) {
  console.error('FATAL: Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

if (isProd && process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production') {
  console.error('FATAL: JWT_SECRET is still the placeholder value in production.');
  process.exit(1);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Dev:  allow localhost origins
// Prod: read from ALLOWED_ORIGINS env var (comma-separated domains)
const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5005',
  'http://127.0.0.1:5005',
];

const prodOrigins = [
  'https://ondailylogs.store',
  'https://www.ondailylogs.store',
  'https://onadailylogs.vercel.app',          // primary Vercel deployment
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
];

const allowedOrigins = isProd ? prodOrigins : devOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment URL (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Security Headers (helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP disabled to avoid breaking inline scripts in frontend
  crossOriginEmbedderPolicy: false,
}));

app.use((req, res, next) => {
  // Prevent browsers from caching API responses that contain sensitive data
  if (req.path.startsWith('/api/')) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
  }
  next();
});

// ─── Body Parsers ────────────────────────────────────────────────────────────
// The `verify` callback saves the raw body buffer on `req.rawBody` so that
// webhook handlers (OxaPay, NowPayments) can verify HMAC signatures against
// the exact original bytes — re-stringifying a parsed object is NOT safe.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadPath));
app.use(express.static(path.join(__dirname, 'frontend')));

// ─── Routes ───────────────────────────────────────────────────────────────────
// Strict rate limit on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // max 300 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP. Please try again in 15 minutes.' },
});

app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/deposits', require('./routes/deposits'));
app.use('/api/admin',    require('./routes/admin'));


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:     true,
    message:     'On A Daily Logs API is running 🚀',
    environment: isProd ? 'production' : 'development',
    timestamp:   new Date(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Never expose internal error details in production
  console.error('Unhandled error:', err);
  const message = isProd ? 'Internal server error.' : (err.message || 'Internal server error.');
  res.status(500).json({ success: false, message });
});

// ─── Start Server (local only — Vercel handles this in production) ────────────
if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 On A Daily Logs API running on http://localhost:${PORT}`);
    console.log(`🌍 Environment : ${isProd ? 'PRODUCTION' : 'development'}`);
    console.log(`🔒 CORS origins: ${allowedOrigins.join(', ') || '(none set!)'}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);

    if (isProd && !process.env.ALLOWED_ORIGINS) {
      console.warn('⚠️  WARNING: NODE_ENV=production but ALLOWED_ORIGINS is not set in .env!');
    }
    if (process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production') {
      console.warn('⚠️  WARNING: JWT_SECRET is still the default placeholder — change it before going live!');
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`FATAL: Port ${PORT} is already in use. Stop the process using that port or set a different PORT value.`);
      process.exit(1);
    }
    console.error('Server error:', error);
    process.exit(1);
  });
}

module.exports = app;
