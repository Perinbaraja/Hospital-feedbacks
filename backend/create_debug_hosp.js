import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const name = 'Debug Hospital';
        const email = 'debug@hospital.com';
        const pass = 'password123';
        
        await Hospital.deleteOne({ name });
        await User.deleteOne({ email });
        
        const hospital = await Hospital.create({
            name,
            address: '123 Debug St',
            city: 'Debug City',
            adminEmail: email,
            uniqueId: 'debug-hosp-' + Math.floor(Math.random() * 1000),
            isActive: true
        });
        
        await User.create({
            name: 'Debug Admin',
            email: email,
            password: pass,
            role: 'Admin',
            hospital: hospital._id,
            isActive: true
        });
        
        console.log('Debug Hospital and Admin created.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
