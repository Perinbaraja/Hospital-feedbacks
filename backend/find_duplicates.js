import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const findDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({
            $or: [
                { email: /canteen/i },
                { name: /canteen/i }
            ]
        });
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} [${u.role}] ID: ${u._id}`);
        });
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

findDuplicates();
