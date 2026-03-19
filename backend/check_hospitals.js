import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const checkHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({}).select('name _id uniqueId');
        console.log('--- Current Hospitals ---');
        hospitals.forEach(h => console.log(`${h.name} (${h._id}) - Slug: ${h.uniqueId}`));
        process.exit();
    } catch (error) {
        process.exit(1);
    }
};

checkHospitals();
