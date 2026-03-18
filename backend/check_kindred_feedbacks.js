import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feedback from './models/Feedback.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitalId = '69a95f174bac5edf442e31ac';
        const feedbacks = await Feedback.find({ hospital: hospitalId }).select('feedbackId status categories');
        console.log(`Feedbacks for ${hospitalId}:`, JSON.stringify(feedbacks, null, 2));
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
