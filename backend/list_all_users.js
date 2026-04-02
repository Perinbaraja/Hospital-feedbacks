import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';

dotenv.config();

const listAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).populate('hospital');
        console.log('--- ALL USERS ---');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) | Role: '${u.role}' | Hospital: ${u.hospital?.name} | Active: ${u.isActive}`);
        });
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listAllUsers();
