import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const email = 'government@hospital.com';
        const users = await User.find({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        console.log(`Found ${users.length} users for ${email}:`);
        users.forEach((u, i) => {
            console.log(`${i+1}: ID=${u._id}, Email="${u.email}", Role=${u.role}, Active=${u.isActive}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
