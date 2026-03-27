import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });

import Feedback from './backend/models/Feedback.js';

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // 1. Fetch latest 2 records
        const latest = await Feedback.find({})
            .sort({ _id: -1 })
            .limit(2);
            
        const latestIds = latest.map(f => f._id);
        
        // 2. Delete all other records
        const result = await Feedback.deleteMany({
            _id: { $nin: latestIds }
        });
        
        console.log(`Successfully kept ${latest.length} records and removed ${result.deletedCount} old feedback records.`);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

cleanup();
