import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const debugUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'medicine@hospital.com' }).populate('hospital');
        console.log('--- Debugging medicine@hospital.com ---');
        console.log('User found:', !!user);
        if (user) {
            console.log('Role:', user.role);
            console.log('Dept:', user.department);
            console.log('Is Active:', user.isActive);
            console.log('Hospital Linked:', !!user.hospital);
        }
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugUser();
