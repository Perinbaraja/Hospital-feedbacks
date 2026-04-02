import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import Department from './models/Department.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({});
        for (const h of hospitals) {
            console.log(`Hospital: ${h.name}`);
            console.log(`Departments:`, h.departments.map(d => d.name));
        }
        const standalones = await Department.find({});
        console.log(`Standalone Departments Count: ${standalones.length}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
