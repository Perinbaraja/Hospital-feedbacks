import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __resetAdminFilename = fileURLToPath(import.meta.url);
const __resetAdminDirname = path.dirname(__resetAdminFilename);

dotenv.config({ path: path.join(__resetAdminDirname, '.env') });

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
