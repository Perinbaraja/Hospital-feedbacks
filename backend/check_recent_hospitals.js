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
        const hospitals = await Hospital.find({}).sort({ createdAt: -1 }).limit(3);
        console.log('Recent Hospitals:');
        hospitals.forEach(h => {
            console.log(`- ${h.name} (${h.uniqueId}) | Admin: ${h.adminEmail}`);
        });
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
