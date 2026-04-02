import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import Feedback from './models/Feedback.js';

dotenv.config();

const findUploads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({
            $or: [
                { logoUrl: /uploads/ },
                { feedbackBgUrl: /uploads/ },
                { 'departments.imageUrl': /uploads/ }
            ]
        });
        
        console.log(`Hospitals referencing uploads: ${hospitals.length}`);
        hospitals.forEach(h => {
             if (h.logoUrl?.includes('uploads')) console.log(`  - Logo: ${h.logoUrl}`);
             if (h.feedbackBgUrl?.includes('uploads')) console.log(`  - Bg: ${h.feedbackBgUrl}`);
             h.departments.forEach(d => {
                 if (d.imageUrl?.includes('uploads')) console.log(`  - Dept ${d.name}: ${d.imageUrl}`);
             });
        });

        const feedbacks = await Feedback.find({ 'categories.image': /uploads/ });
        console.log(`Feedbacks referencing uploads: ${feedbacks.length}`);
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

findUploads();
