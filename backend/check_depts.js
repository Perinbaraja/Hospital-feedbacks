import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

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
