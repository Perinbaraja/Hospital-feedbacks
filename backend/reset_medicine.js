import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'medicine@hospital.com' });
        if (user) {
            user.password = 'password123';
            user.isActive = true;
            await user.save();
            console.log('--- medicine@hospital.com password reset to: password123 ---');
        } else {
            console.log('--- User not found ---');
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetPassword();
