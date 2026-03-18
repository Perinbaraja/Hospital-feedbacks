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
        const email = 'erajivv@gmail.com';
        const user = await User.findOne({ email: { $regex: new RegExp(email, 'i') } });
        if (user) {
            console.log(`User found with email regex: ${user.email}`);
        } else {
            console.log(`Email ${email} absolutely not found.`);
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
