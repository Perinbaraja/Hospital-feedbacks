import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Feedback from './models/Feedback.js';

dotenv.config();

const cleanData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB for cleanup...');

        // 1. Trim all User departments
        const users = await User.find({ role: 'Dept_Head' });
        for (let user of users) {
            if (user.department) {
                const original = user.department;
                user.department = user.department.trim();
                if (original !== user.department) {
                    await user.save();
                    console.log(`Cleaned User Dept: "${original}" -> "${user.department}"`);
                }
            }
        }

        // 2. Trim all Feedback assignments
        const feedbacks = await Feedback.find({ assignedTo: { $exists: true, $ne: null } });
        for (let fb of feedbacks) {
            const original = fb.assignedTo;
            fb.assignedTo = fb.assignedTo.split(',').map(s => s.trim()).join(', ');
            if (original !== fb.assignedTo) {
                await fb.save();
                console.log(`Cleaned Feedback Assignment: "${original}" -> "${fb.assignedTo}"`);
            }
        }

        console.log('Cleanup complete!');
        process.exit();
    } catch (error) {
        console.error('Cleanup Error:', error);
        process.exit(1);
    }
};

cleanData();
