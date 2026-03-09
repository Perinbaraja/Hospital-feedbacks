import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import Hospital from './models/Hospital.js';

import userRoutes from './routes/userRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';

import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config(); // Load from root
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(path.resolve(), '.env') });
}

const app = express();
const cwd = process.cwd();

if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is not defined in environment variables.');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not defined. Authentication will fail.');
}

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

const uploadDir = path.join(cwd, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/super-admin', superAdminRoutes);

if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(cwd, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendDist, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Hospital Feedback API is running...');
    });
}

const PORT = process.env.PORT || 5000;

const connectDB = async (retryCount = 5) => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        console.log('✅ MongoDB Connected');

        // One-time cleanup: Remove "My Hospital" placeholder as requested
        await Hospital.deleteMany({ name: 'My Hospital' });

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('\n❌ MongoDB Connection Error:');
        console.error(error.message);

        if (error.message.includes('ETIMEOUT') || error.message.includes('querySrv')) {
            console.error('\n📡 DNS/Network Error detected.');
            console.error('💡 TIP: Check your internet connection or DNS settings.');
            console.error('💡 TIP: Ensure your MongoDB Atlas connection string is correct.');
        }

        if (error.message.includes('whitelisted')) {
            console.error('\n💡 TIP: Make sure your current IP is whitelisted in MongoDB Atlas.');
            console.error('   Visit: https://www.mongodb.com/docs/atlas/security-whitelist/');
        }

        if (retryCount > 0) {
            console.log(`🔄 Retrying connection in 5 seconds... (${retryCount} retries left)`);
            setTimeout(() => connectDB(retryCount - 1), 5000);
        } else {
            console.error('\n💥 Max retries reached. Exiting...');
            process.exit(1);
        }
    }
};

connectDB();

