import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const fixParking = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'parking@hospital.com' });
        if (user) {
            user.password = 'password123';
            user.isActive = true;
            // Ensure department is clean
            user.department = 'PARKING';
            await user.save();
            console.log('--- parking@hospital.com reset successful ---');
            console.log('Password: password123');
            console.log('Department: ', user.department);
        } else {
            console.log('--- User not found ---');
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixParking();
