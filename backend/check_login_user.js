import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const email = 'erajivv@gmail.com';
        const user = await User.findOne({ email }).populate('hospital');
        
        if (user) {
            console.log('User found:');
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Is Active (User): ${user.isActive}`);
            if (user.hospital) {
                console.log(`Hospital: ${user.hospital.name}`);
                console.log(`Is Active (Hospital): ${user.hospital.isActive}`);
            } else {
                console.log('No hospital associated with this user.');
            }
        } else {
            console.log(`User ${email} NOT found.`);
            // List all users to see if there's a typo
            const allUsers = await User.find({}).select('email role');
            console.log('Available users:', allUsers.map(u => u.email).join(', '));
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
