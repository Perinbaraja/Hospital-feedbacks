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
        const result = await Feedback.deleteMany({
            positive: null,
            negative: null
        });
        console.log(`Successfully removed ${result.deletedCount} invalid feedback records.`);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

cleanup();
