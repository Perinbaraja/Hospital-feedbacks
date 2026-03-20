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
        const user = await User.findOne({ email: { $regex: new RegExp(email, 'i') } }).populate('hospital');
        if (user) {
            console.log(`User Name: ${user.name}`);
            console.log(`Hospital object raw: ${user.hospital}`);
            console.log(`Hospital Type: ${typeof user.hospital}`);
            console.log(`Hospital _id: ${user.hospital?._id}`);
            console.log(`Result of (user.hospital?._id || user.hospital): ${user.hospital?._id || user.hospital}`);
        } else {
            console.log(`Email ${email} absolutely not found.`);
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
