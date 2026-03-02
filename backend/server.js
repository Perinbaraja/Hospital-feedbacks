import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

import userRoutes from './routes/userRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/', (req, res) => {
    res.send('Hospital Feedback API is running...');
});

const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    });
