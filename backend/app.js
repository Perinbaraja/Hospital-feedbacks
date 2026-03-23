import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

let __appDirname;
if (typeof __dirname !== 'undefined') {
  __appDirname = __dirname;
} else if (typeof import.meta !== 'undefined' && import.meta.url) {
  const __appFilename = fileURLToPath(import.meta.url);
  __appDirname = path.dirname(__appFilename);
} else {
  __appDirname = path.resolve(process.cwd(), 'backend');
}

// Load .env for local development (Netlify provides env vars in deployed runtime)
dotenv.config({ path: path.join(__appDirname, '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const app = express();

app.use(
  cors({
    origin: '*',
  })
);

// Netlify function path prefix handling
// Requests arrive as '/.netlify/functions/api/...' when called directly; strip the prefix for routing.
app.use((req, res, next) => {
  const functionPrefix = '/.netlify/functions/api';
  if (req.path.startsWith(functionPrefix)) {
    req.url = req.url.replace(functionPrefix, '') || '/';
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      console.error('❌ JSON parse error:', err);
    }
  }
  next();
});
// API routes (direct root path inside Lambda function)
app.use('/users', userRoutes);
app.use('/hospital', hospitalRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/departments', departmentRoutes);

// health check path (always available at function root)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Feedback API (serverless) is running' });
});

export default app;
