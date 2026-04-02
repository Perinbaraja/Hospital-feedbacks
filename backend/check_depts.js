import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

import path from 'path';

// Load environment variables
dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(path.resolve(), '.env') });
}

const checkDepts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hosp = await Hospital.findOne({ name: 'Grand City Hospital' });
        if (hosp) {
            console.log('Hospital Departments:');
            hosp.departments.forEach(d => {
                console.log(`- ${d.name}`);
            });
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDepts();
