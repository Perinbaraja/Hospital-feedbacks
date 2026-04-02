import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({ name: /MODERN/i });
        hospitals.forEach(h => {
            console.log(`Hospital: ${h.name}`);
            console.log(`- CreatedAt: ${h.createdAt}`);
            console.log(`- UniqueId: ${h.uniqueId}`);
        });
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
