import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const checkImages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({});
        console.log(`Found ${hospitals.length} hospitals.`);
        hospitals.forEach(h => {
            console.log(`\nHospital: ${h.name}`);
            console.log(`Logo URL: ${h.logoUrl ? h.logoUrl.substring(0, 50) + '...' : 'NONE'}`);
            console.log(`BG URL: ${h.feedbackBgUrl ? h.feedbackBgUrl.substring(0, 50) + '...' : 'NONE'}`);
            console.log('Departments:');
            h.departments.forEach(d => {
                console.log(`- ${d.name}: ${d.imageUrl ? (d.imageUrl.startsWith('data:') ? 'BASE64_DATA' : d.imageUrl.substring(0, 50) + '...') : 'NONE'}`);
            });
        });
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkImages();
