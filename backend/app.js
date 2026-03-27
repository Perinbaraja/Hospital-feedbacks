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
import _Feedback from './models/Feedback.js';
import { protect, admin } from './routes/userRoutes.js';

const userRoutes = _userRoutes?.default || _userRoutes;
const hospitalRoutes = _hospitalRoutes?.default || _hospitalRoutes;
const feedbackRoutes = _feedbackRoutes?.default || _feedbackRoutes;
const superAdminRoutes = _superAdminRoutes?.default || _superAdminRoutes;
const departmentRoutes = _departmentRoutes?.default || _departmentRoutes;
const Feedback = _Feedback?.default || _Feedback;

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
  const prefixes = ['/.netlify/functions/api', '/api'];
  for (const prefix of prefixes) {
    if (req.path.startsWith(prefix)) {
      req.url = req.url.replace(prefix, '') || '/';
      break; 
    }
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API routes (direct root path inside Lambda function)
app.use('/users', userRoutes);
app.use('/hospital', hospitalRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/departments', departmentRoutes);

// @desc    Dashboard Metrics (Central Route for frontend binding)
// @route   GET /api/admin/dashboard
app.get('/admin/dashboard', protect, admin, async (req, res) => {
    try {
        const query = {};
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedAuthRole === 'superadmin';
        
        const { hospitalId: queryHospitalId } = req.query;

        if (!isSuperAdmin) {
            // Normal Admin: Restricted to their own hospital
            query.hospitalId = req.user.hospitalId;
        } else if (queryHospitalId) {
            // Super Admin: View a specific hospital if requested
            query.hospitalId = queryHospitalId;
        }
        // If super admin and no hospitalId, query remains empty (total aggregate for super admin overview)

        const totalEncounters = await Feedback.countDocuments(query);
        const positiveCount = await Feedback.countDocuments({ 
            ...query,
            positive: { $ne: null } 
        });
        const negativeCount = await Feedback.countDocuments({ 
            ...query,
            negative: { $ne: null } 
        });
        
        // Resolved issues are typically negatives that were completed
        const resolvedIssues = await Feedback.countDocuments({ 
            ...query, 
            status: "COMPLETED" 
        });

        // Get department-wise distribution
        const deptDistribution = await Feedback.aggregate([
            { $match: query },
            { $unwind: "$categories" },
            { $group: {
                _id: "$categories.department",
                count: { $sum: 1 }
            }},
            { $project: {
                name: "$_id",
                count: 1,
                _id: 0
            }}
        ]);

        res.json({
            totalEncounters,
            positiveCount,
            negativeCount,
            resolvedIssues,
            deptDistribution
        });
    } catch (error) {
        console.error('Core Dashboard Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// health check path (always available at function root)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Feedback API (serverless) is running' });
});

export default app;
