import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from './models/Department.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitalId = '69a95f174bac5edf442e31ac';
        const depts = await Department.find({ hospital: hospitalId });
        console.log(`Departments for ${hospitalId}:`, JSON.stringify(depts, null, 2));
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
