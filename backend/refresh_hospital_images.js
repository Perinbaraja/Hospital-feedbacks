import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const fixImages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospital = await Hospital.findOne({ name: 'Grand City Hospital' });
        if (hospital) {
            console.log('Fixing Grand City Hospital images...');

            // Set a real logo if it's broken
            if (!hospital.logoUrl || hospital.logoUrl.startsWith('/')) {
                hospital.logoUrl = 'https://cdn-icons-png.flaticon.com/512/3063/3063224.png';
            }

            // Set a real background if it's broken
            if (!hospital.feedbackBgUrl || hospital.feedbackBgUrl.startsWith('/')) {
                hospital.feedbackBgUrl = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1400';
            }

            // Fix department images
            const defaultIcons = {
                'MEDICINES': 'https://cdn-icons-png.flaticon.com/512/883/883407.png',
                'DOCTOR ': 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png',
                'CANTEEN': 'https://cdn-icons-png.flaticon.com/512/2830/2830175.png',
                'PARKING': 'https://cdn-icons-png.flaticon.com/512/2830/2830175.png',
                'cleanliness': 'https://cdn-icons-png.flaticon.com/512/159/159599.png',
                'Radiology': 'https://cdn-icons-png.flaticon.com/512/4812/4812853.png'
            };

            hospital.departments.forEach(dept => {
                if (!dept.imageUrl || dept.imageUrl.startsWith('/')) {
                    dept.imageUrl = defaultIcons[dept.name] || 'https://cdn-icons-png.flaticon.com/512/2965/2965279.png';
                }
            });

            await hospital.save();
            console.log('Hospital configuration refreshed with working URLs.');
        } else {
            console.log('Grand City Hospital not found.');
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixImages();
