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
        const hospitalId = '69a95f174bac5edf442e31ac';
        const hosp = await Hospital.findById(hospitalId).select('name departments tvFilters');
        console.log(`Hospital: ${hosp.name}`);
        console.log(`Departments:`, JSON.stringify(hosp.departments.map(d => d.name), null, 2));
        console.log(`TV Filters:`, JSON.stringify(hosp.tvFilters, null, 2));
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
