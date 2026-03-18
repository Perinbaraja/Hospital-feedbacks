import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).sort({ createdAt: -1 }).limit(10);
        console.log('--- RECENT USERS ---');
        for (const u of users) {
             const h = await Hospital.findById(u.hospital);
             console.log(`Email: ${u.email} | Role: ${u.role} | Hosp: ${h?.name || 'NONE'} | Added: ${u.createdAt}`);
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
