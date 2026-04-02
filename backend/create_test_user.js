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
        const email = 'testadmin@hospital.com';
        const pass = 'password123';
        
        // Remove if exists
        await User.deleteOne({ email });
        
        const user = await User.create({
            name: 'Test Admin',
            email: email,
            password: pass,
            role: 'Admin',
            hospital: '69b28e39c0d2be0b0a836c76',
            isActive: true
        });
        
        console.log('Test User Created:', user.email);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
