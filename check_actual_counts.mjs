import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Feedback = mongoose.connection.collection('feedbacks');
        const total = await Feedback.countDocuments();
        
        // Correct conditions based on what I saw in AdminFeedback.jsx
        const positive = await Feedback.countDocuments({ 
            "categories.reviewType": { $in: ["Positive", "positive", "completely_satisfied", "completely satisfied"] } 
        });
        const negative = await Feedback.countDocuments({ 
            "categories.reviewType": { $in: ["Negative", "negative", "needs_work", "Needs Work", "not_satisfied", "not satisfied"] } 
        });
        const pending = await Feedback.countDocuments({ status: "Pending" });
        const resolved = await Feedback.countDocuments({ status: "COMPLETED" });

        console.log({ total, positive, negative, pending, resolved });
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
check();
