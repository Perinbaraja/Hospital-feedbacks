import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const UserSchema = new mongoose.Schema({ hospital: mongoose.Schema.Types.ObjectId, hospitalId: String }, { strict: false });
const FeedbackSchema = new mongoose.Schema({ hospital: mongoose.Schema.Types.ObjectId, hospitalId: String }, { strict: false });
const DepartmentSchema = new mongoose.Schema({ hospital: mongoose.Schema.Types.ObjectId, hospitalId: String }, { strict: false });

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('UserMigrate', UserSchema, 'users');
        const Feedback = mongoose.model('FeedbackMigrate', FeedbackSchema, 'feedbacks');
        const Department = mongoose.model('DepartmentMigrate', DepartmentSchema, 'departments');

        // Migrate Users
        const users = await User.find({ hospitalId: { $exists: false }, hospital: { $exists: true } });
        console.log(`Migrating ${users.length} users...`);
        for (const user of users) {
            user.hospitalId = user.hospital.toString();
            await user.save();
        }

        // Migrate Feedbacks
        const feedbacks = await Feedback.find({ hospitalId: { $exists: false }, hospital: { $exists: true } });
        console.log(`Migrating ${feedbacks.length} feedbacks...`);
        for (const fb of feedbacks) {
            fb.hospitalId = fb.hospital.toString();
            await fb.save();
        }

        // Migrate Departments
        const depts = await Department.find({ hospitalId: { $exists: false }, hospital: { $exists: true } });
        console.log(`Migrating ${depts.length} departments...`);
        for (const dept of depts) {
            dept.hospitalId = dept.hospital.toString();
            await dept.save();
        }
        
        // Handle Super Admins (no hospitalId requested?)
        // The prompt says "Ensure every collection includes hospitalId field: hospitalId: { type: String, required: true }"
        // This is tricky for Super Admins. I'll give them "GLOBAL" or similar if they lack a hospital.
        const superAdmins = await User.find({ hospitalId: { $exists: false }, hospital: { $exists: false } });
        console.log(`Assigning GLOBAL hospitalId to ${superAdmins.length} super admins...`);
        for (const sa of superAdmins) {
            sa.hospitalId = 'GLOBAL'; 
            await sa.save();
        }

        console.log('Migration complete');
        await mongoose.disconnect();
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
