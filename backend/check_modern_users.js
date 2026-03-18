import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({ name: /MODERN/i });
        console.log(`Hospitals found: ${hospitals.length}`);
        
        for (const h of hospitals) {
            console.log(`Hospital: ${h.name} (${h._id})`);
            const users = await User.find({ hospital: h._id });
            console.log(`- Users found: ${users.length}`);
            users.forEach(u => {
                console.log(`  - ${u.email} | Role: ${u.role}`);
            });
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
