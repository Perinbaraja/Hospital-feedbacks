import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const resetSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'super@hospital.com' });
        if (user) {
            user.password = 'superpassword';
            await user.save();
            console.log('--- super@hospital.com password reset to: superpassword ---');
        } else {
            console.log('--- Super Admin user not found ---');
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetSuperAdmin();
