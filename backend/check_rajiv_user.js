import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const u = await User.findOne({ email: 'rajivcs03@gmail.com' }).populate('hospital');
        if (u) {
            console.log(`User found: ${u.email}`);
            console.log(`Role: ${u.role}`);
            console.log(`Hospital: ${u.hospital?.name || 'NONE'}`);
        } else {
            console.log('User not found.');
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
