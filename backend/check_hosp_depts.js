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
        const hospitals = await Hospital.find({});
        hospitals.forEach(h => {
            console.log(`Hospital: ${h.name}`);
            console.log(`Departments Array:`, JSON.stringify(h.departments, null, 2));
        });
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
