import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import userRoutes from './routes/userRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const isNetlify = process.env.NETLIFY || process.env.NETLIFY_DEV;

// Static uploads (for local use, in serverless this is ephemeral)
if (!isNetlify) {
  const uploadsDir = path.join(__appDirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  app.use('/uploads', express.static(uploadsDir));
} else {
  // Serverless: use /tmp for temporary file handling, avoid /var/task write
  app.use('/uploads', express.static('/tmp'));
}


// API routes
app.use('/api/users', userRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/departments', departmentRoutes);

// health check path for Netlify
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Feedback API (serverless) is running' });
});

export default app;
