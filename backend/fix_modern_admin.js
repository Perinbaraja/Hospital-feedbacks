import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const update = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'moder@hospital.com' });
        if (user) {
            user.email = 'erajivv@gmail.com';
            user.password = 'modernhospital';
            await user.save();
            console.log('Update Successful: User for MODERN HOSPITAL is now erajivv@gmail.com with password modernhospital');
        } else {
            console.log('User moder@hospital.com not found. Creation might have failed differently.');
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

update();
