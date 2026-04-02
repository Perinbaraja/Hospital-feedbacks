import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import _Feedback from './models/Feedback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const Feedback = _Feedback?.default || _Feedback;

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        console.log('Migrating "Needs Work" to "negative"...');
        
        // Update all feedback records
        // We need to use $set with positional operator for array elements
        // This updates the first category. Since most feedbacks only have one, it's usually enough.
        // But for safety, we can use a loop or updateMany with filter.
        
        const feedbacks = await Feedback.find({ "categories.reviewType": "Needs Work" });
        console.log(`Found ${feedbacks.length} feedbacks to update.`);

        let count = 0;
        for (const fb of feedbacks) {
            fb.categories.forEach(cat => {
                if (cat.reviewType === 'Needs Work') {
                    cat.reviewType = 'negative';
                }
            });
            fb.markModified('categories');
            await fb.save();
            count++;
        }

        console.log(`Migration completed: ${count} records updated.`);

        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrate();
