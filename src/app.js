const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { env, requireEnv } = require('./config/env');
const { fail } = require('./utils/responses');
const { errorHandler } = require('./middlewares/errorHandler');
const { authRequired } = require('./middlewares/auth');

// routes
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const residentesRoutes = require('./modules/residentes/residentes.routes');
const enfermeriaRoutes = require('./modules/enfermeria/enfermeria.routes');
const historialRoutes = require('./modules/historial/historial.routes');
const auditoriaRoutes = require('./modules/auditoria/auditoria.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');

requireEnv();

const app = express();

// ✅ si estás detrás de proxy (Render/VPS/Cloudflare/Nginx) y usás cookies/jwt httpOnly:
app.set('trust proxy', 1);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(morgan('dev'));

// ============================================================
// ✅ CORS PRO (Render backend -> Netlify frontend)
// - Allowlist por ENV (CORS_ORIGIN) o defaults seguros
// - Permite previews de Netlify (*.netlify.app)
// - Preflight SIEMPRE usa las mismas options (evita 500 en OPTIONS)
// ============================================================

// ✅ Frontend actual:
const DEFAULT_ALLOWED = [
  'http://localhost:4200',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://servimelmvp.netlify.app',
];

// Ej: CORS_ORIGIN="https://servimelmvp.netlify.app,https://tudominio.com"
const rawOrigin = env('CORS_ORIGIN', DEFAULT_ALLOWED.join(','));

const allowList = String(rawOrigin)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ Permitir branch deploys / previews de netlify
const NETLIFY_PREVIEW_REGEX = /^https:\/\/.*\.netlify\.app$/;

const corsOptions = {
  origin: (origin, cb) => {
    // Requests sin Origin (Postman/curl/health checks)
    if (!origin) return cb(null, true);

    // Allowlist exacta
    if (allowList.includes(origin)) return cb(null, true);

    // ✅ Netlify preview
    if (NETLIFY_PREVIEW_REGEX.test(origin)) return cb(null, true);

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// ✅ CORS antes de rutas
app.use(cors(corsOptions));

// ✅ Preflight explícito con MISMAS options (clave)
app.options('*', cors(corsOptions));

// Health
app.get('/health', (req, res) => res.json({ ok: true, data: { status: 'up' } }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/residentes', residentesRoutes);
app.use('/enfermeria', enfermeriaRoutes);
app.use('/historial', historialRoutes);
app.use('/auditoria', auditoriaRoutes);
app.use('/settings', settingsRoutes);

// ✅ dashboard protegido
app.use('/dashboard', authRequired, dashboardRoutes);
app.use('/servicios', serviciosRoutes);

// 404
app.use((req, res) => fail(res, 'NOT_FOUND', 'Route not found', 404));

app.use(errorHandler);

module.exports = { app };
