import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Feedback from './models/Feedback.js';

dotenv.config();

const auditSystem = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\n🔍 --- HOSPITAL FEEDBACK SYSTEM AUDIT ---\n');

        const deptHeads = await User.find({ role: 'Dept_Head' });

        for (const head of deptHeads) {
            console.log(`👤 DEPT HEAD: ${head.email}`);
            console.log(`   Department: "${head.department}"`);

            // Check assignments for this head
            const assignments = await Feedback.find({
                assignedTo: { $regex: head.department.trim(), $options: 'i' }
            });

            console.log(`   Assigned Feedbacks: ${assignments.length}`);

            if (assignments.length > 0) {
                assignments.forEach((a, i) => {
                    console.log(`     [${i + 1}] Ref ID: ${a._id} - Status: ${a.status}`);
                });
            } else {
                console.log(`     (No assignments found)`);
            }
            console.log('------------------------------------------');
        }

        process.exit();
    } catch (error) {
        console.error('Audit Error:', error);
        process.exit(1);
    }
};

auditSystem();
