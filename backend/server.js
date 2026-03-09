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

dotenv.config();

const app = express();

app.use(cors({
  origin: "*"
}))
app.use(express.json());

const __dirname = path.resolve();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/', (req, res) => {
    res.send('Hospital Feedback API is running...');
});

const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        // One-time cleanup: Remove "My Hospital" placeholder as requested
        await Hospital.deleteMany({ name: 'My Hospital' });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    });
