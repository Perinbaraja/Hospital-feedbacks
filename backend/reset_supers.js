import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const resetSupers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const supers = await User.find({ role: { $in: ['Super_Admin', 'super_admin'] } });
        console.log(`Found ${supers.length} super admins. Resetting passwords to 'password123'...`);
        for (let s of supers) {
            s.password = 'password123';
            s.isActive = true;
            await s.save();
            console.log(`- Reset: ${s.email}`);
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

resetSupers();
