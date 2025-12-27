const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { env, requireEnv } = require('./config/env');
const { fail } = require('./utils/responses');
const { errorHandler } = require('./middlewares/errorHandler');
const { authRequired } = require('./middlewares/auth'); // ✅ ADD: proteger dashboard

// routes
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const residentesRoutes = require('./modules/residentes/residentes.routes');
const enfermeriaRoutes = require('./modules/enfermeria/enfermeria.routes');
const historialRoutes = require('./modules/historial/historial.routes');
const auditoriaRoutes = require('./modules/auditoria/auditoria.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

requireEnv();

const app = express();

// ✅ si estás detrás de proxy (Render/VPS/Cloudflare/Nginx) y usás cookies/jwt httpOnly:
app.set('trust proxy', 1);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(morgan('dev'));

// ✅ CORS robusto: soporta 1 o muchos orígenes (separados por coma)
// Ej: CORS_ORIGIN="http://localhost:4200,https://servimel.uy"
const rawOrigin = env('CORS_ORIGIN', 'http://localhost:4200');
const allowList = String(rawOrigin)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requests sin Origin (Postman, curl, server-to-server)
      if (!origin) return cb(null, true);

      // Si allowList quedó vacío por config, permite igual en dev
      if (!allowList.length) return cb(null, true);

      if (allowList.includes(origin)) return cb(null, true);

      // Deniega si no está permitido
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ✅ Preflight explícito (evita 404 raros con OPTIONS)
app.options('*', cors());

app.get('/health', (req, res) => res.json({ ok: true, data: { status: 'up' } }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/residentes', residentesRoutes);
app.use('/enfermeria', enfermeriaRoutes);
app.use('/historial', historialRoutes);
app.use('/auditoria', auditoriaRoutes);
app.use('/settings', settingsRoutes);

// ✅ FIX: dashboard protegido (antes se podía pegar sin token)
app.use('/dashboard', authRequired, dashboardRoutes);

// 404
app.use((req, res) => fail(res, 'NOT_FOUND', 'Route not found', 404));

app.use(errorHandler);

module.exports = { app };
