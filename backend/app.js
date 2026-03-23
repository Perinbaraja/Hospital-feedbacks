import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import _userRoutes from './routes/userRoutes.js';
import _hospitalRoutes from './routes/hospitalRoutes.js';
import _feedbackRoutes from './routes/feedbackRoutes.js';
import _superAdminRoutes from './routes/superAdminRoutes.js';
import _departmentRoutes from './routes/departmentRoutes.js';

const userRoutes = _userRoutes?.default || _userRoutes;
const hospitalRoutes = _hospitalRoutes?.default || _hospitalRoutes;
const feedbackRoutes = _feedbackRoutes?.default || _feedbackRoutes;
const superAdminRoutes = _superAdminRoutes?.default || _superAdminRoutes;
const departmentRoutes = _departmentRoutes?.default || _departmentRoutes;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// ✅ CORS
app.use(cors({ origin: '*' }));

// ✅ IMPORTANT: Fix Netlify path
app.use((req, res, next) => {
  const prefix = '/.netlify/functions/api';
  if (req.url.startsWith(prefix)) {
    req.url = req.url.replace(prefix, '') || '/';
  }
  next();
});

// ✅ Parse JSON (MUST)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ CRITICAL FIX for Netlify (string body issue)
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      console.error('Body parse error:', err);
    }
  }
  next();
});

// ✅ ROUTES
app.use('/users', userRoutes);
app.use('/hospital', hospitalRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/departments', departmentRoutes);

// ✅ HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API running 🚀' });
});

export default app;