import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feedback from './models/Feedback.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const latest = await Feedback.find().sort({ createdAt: -1 }).limit(10);
        latest.forEach(fb => {
            const cat = fb.categories[0];
            console.log(`\nID: ${fb.feedbackId} (${fb._id})`);
            console.log(`- Positive Issues:`, cat.positive_issues);
            console.log(`- Positive Feedback:`, cat.positive_feedback);
            console.log(`- Type:`, typeof cat.positive_feedback);
            console.log(`- Is Array:`, Array.isArray(cat.positive_feedback));
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
check();
