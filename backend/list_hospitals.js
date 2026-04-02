import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({});
        console.log(`Found ${hospitals.length} hospitals:`);
        hospitals.forEach((h, i) => {
            console.log(`${i+1}: ID=${h._id}, Name="${h.name}", qrId="${h.qrId}", uniqueId="${h.uniqueId}"`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
