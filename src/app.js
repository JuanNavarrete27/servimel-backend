// src/app.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { env, requireEnv } = require('./config/env');
const { fail } = require('./utils/responses');
const { errorHandler } = require('./middlewares/errorHandler');
const { authRequired } = require('./middlewares/auth');

// routes (existentes)
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const residentesRoutes = require('./modules/residentes/residentes.routes');
const enfermeriaRoutes = require('./modules/enfermeria/enfermeria.routes');
const historialRoutes = require('./modules/historial/historial.routes');
const auditoriaRoutes = require('./modules/auditoria/auditoria.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');

// ============================================================
// ✅ ENV guard (compat DB_* y/o MYSQL_ADDON_*)
// ============================================================
function requireEnvCompat() {
  try {
    requireEnv();
    return;
  } catch (_) {
    const missing = [];

    const hasDbHost = !!process.env.DB_HOST || !!process.env.MYSQL_ADDON_HOST;
    const hasDbUser = !!process.env.DB_USER || !!process.env.MYSQL_ADDON_USER;
    const hasDbPass = !!process.env.DB_PASSWORD || !!process.env.MYSQL_ADDON_PASSWORD;
    const hasDbName = !!process.env.DB_NAME || !!process.env.MYSQL_ADDON_DB;

    if (!hasDbHost) missing.push('DB_HOST|MYSQL_ADDON_HOST');
    if (!hasDbUser) missing.push('DB_USER|MYSQL_ADDON_USER');
    if (!hasDbPass) missing.push('DB_PASSWORD|MYSQL_ADDON_PASSWORD');
    if (!hasDbName) missing.push('DB_NAME|MYSQL_ADDON_DB');

    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.CORS_ORIGIN) missing.push('CORS_ORIGIN');

    if (missing.length) {
      // eslint-disable-next-line no-console
      console.error('[ENV] Missing required env vars:', missing.join(', '));
      throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }
  }
}

requireEnvCompat();

const app = express();

// ✅ si estás detrás de proxy (Render/VPS/Cloudflare/Nginx)
app.set('trust proxy', 1);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(morgan('dev'));

// ============================================================
// ✅ CORS PRO
// ============================================================

const DEFAULT_ALLOWED = [
  'http://localhost:4200',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://servimelmvp.netlify.app',
];

const rawOrigin = env('CORS_ORIGIN', DEFAULT_ALLOWED.join(','));

const allowList = String(rawOrigin)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const NETLIFY_PREVIEW_REGEX = /^https:\/\/.*\.netlify\.app$/;

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    if (NETLIFY_PREVIEW_REGEX.test(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Health
app.get('/health', (req, res) => res.json({ ok: true, data: { status: 'up' } }));

// ============================================================
// Helpers: optionalRequire + safeMount
// ============================================================
function optionalRequire(path) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(path);
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      // eslint-disable-next-line no-console
      console.warn(`[ROUTES] Optional module not found: ${path}`);
      return null;
    }
    throw e;
  }
}

function safeMount(basePath, router) {
  if (!router) return;
  app.use(basePath, authRequired, router);
  // eslint-disable-next-line no-console
  console.log(`[ROUTES] Mounted ${basePath}`);
}

// Routes (existentes)
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/residentes', residentesRoutes);
app.use('/enfermeria', enfermeriaRoutes);
app.use('/historial', historialRoutes);
app.use('/auditoria', auditoriaRoutes);
app.use('/settings', settingsRoutes);

// dashboard protegido
app.use('/dashboard', authRequired, dashboardRoutes);

// servicios protegido
app.use('/servicios', authRequired, serviciosRoutes);

// ============================================================
// ✅ NUEVOS MÓDULOS CLÍNICOS
// ============================================================

// ✅ CORREGIDO: apunta a medicinaGeneral.routes.js (camelCase)
const medicinaGeneralRoutes = optionalRequire('./modules/medicina-general/medicinaGeneral.routes');

const cocinaRoutes = optionalRequire('./modules/cocina/cocina.routes');
const edFisicaRoutes = optionalRequire('./modules/ed-fisica/ed-fisica.routes');
const fisioterapiaRoutes = optionalRequire('./modules/fisioterapia/fisioterapia.routes');
const yogaRoutes = optionalRequire('./modules/yoga/yoga.routes');

// Montajes
safeMount('/medicina-general', medicinaGeneralRoutes);
safeMount('/api/cocina', cocinaRoutes);
safeMount('/api/ed-fisica', edFisicaRoutes);
safeMount('/fisioterapia', fisioterapiaRoutes);
safeMount('/yoga', yogaRoutes);

// 404
app.use((req, res) => fail(res, 'NOT_FOUND', 'Route not found', 404));

// Error handler
app.use(errorHandler);

module.exports = { app };
