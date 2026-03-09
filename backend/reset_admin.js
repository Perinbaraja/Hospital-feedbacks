import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'admin@hospital.com' });
        if (user) {
            user.password = 'password123';
            await user.save();
            console.log('--- admin@hospital.com password reset to: password123 ---');
        } else {
            console.log('--- Admin user not found ---');
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetAdmin();
