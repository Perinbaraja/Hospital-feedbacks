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
        const email = 'rajivcs03@gmail.com';
        const user = await User.findOne({ email }).populate('hospital');
        if (user) {
            console.log(`User ${email} Found:`);
            console.log(`- Role: ${user.role}`);
            console.log(`- Hospital: ${user.hospital?.name || 'NONE'}`);
        } else {
            console.log(`User ${email} not found.`);
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
