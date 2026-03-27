import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });

import Hospital from './backend/models/Hospital.js';
import Department from './backend/models/Department.js';

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospital = await Hospital.findOne({ uniqueId: 'hosp-1772707607341' });
        if (!hospital) {
            console.log('Hospital not found');
            process.exit(1);
        }
        console.log('--- HOSPITAL DEPARTMENTS (NESTED ARRAY) ---');
        hospital.departments.forEach(d => console.log(`- ${d.name} (_id: ${d._id || 'none'})`));

        console.log('\n--- DEPARTMENT COLLECTION ---');
        const departments = await Department.find({ hospitalId: hospital._id.toString() });
        departments.forEach(d => console.log(`- ${d.name} (_id: ${d._id})`));

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
