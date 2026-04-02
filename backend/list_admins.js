import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const listAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ role: { $in: ['Admin', 'hospital_admin'] } }).populate('hospital');
        console.log('Hospital Admins:');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) | Role: '${u.role}' | Hospital: ${u.hospital?.name} | Active: ${u.isActive}`);
        });
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listAdmins();
