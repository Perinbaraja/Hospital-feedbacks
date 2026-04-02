import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __checkDbFilename = fileURLToPath(import.meta.url);
const __checkDbDirname = path.dirname(__checkDbFilename);

dotenv.config({ path: path.resolve(__checkDbDirname, 'backend', '.env') });

import User from './backend/models/User.js';

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const superAdmins = await User.find({ role: { $regex: /super_admin/i } });
        console.log('--- SUPER ADMINS ---');
        superAdmins.forEach(s => console.log(`${s.email} | Role: ${s.role}`));
        
        const allUsers = await User.find({});
        console.log('--- ALL USERS ---');
        allUsers.forEach(u => console.log(`${u.email} | Role: ${u.role}`));
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
