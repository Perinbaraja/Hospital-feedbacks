import mongoose from 'mongoose';
import Hospital from './models/Hospital.js';
import dotenv from 'dotenv';

dotenv.config();

const fixFilters = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const hospital = await Hospital.findOne({ uniqueId: 'modern-hospital-5777' });
        if (hospital) {
            console.log('Found Hospital:', hospital.name);
            hospital.tvFilters.status = 'COMPLETED';
            hospital.tvFilters.type = ''; // All Types
            hospital.tvFilters.departments = []; // All Departments
            await hospital.save();
            console.log('Successfully updated TV filters to COMPLETED and All Types');
        } else {
            console.error('Hospital not found');
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixFilters();
