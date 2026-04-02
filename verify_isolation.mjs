import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });

import Hospital from './backend/models/Hospital.js';

const checkLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({});
        console.log(`Checking ${hospitals.length} hospitals for 'garden' department...`);
        
        hospitals.forEach(h => {
            const hasGarden = h.departments.some(d => d.name.toLowerCase() === 'garden');
            if (hasGarden) {
                console.log(`[FOUND] ${h.name} (${h.uniqueId}) has 'garden' department.`);
            } else {
                console.log(`[OK] ${h.name} (${h.uniqueId}) does NO have 'garden'.`);
            }
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkLeads();
