import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

import path from 'path';

// Load environment variables
dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(path.resolve(), '.env') });
}

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).select('email role department isActive hospital');
        console.log('--- Current Users in Database ---');
        users.forEach(u => console.log(`${u.email} (${u.role}) - Dept: ${u.department} - Hospital: ${u.hospital}`));
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
