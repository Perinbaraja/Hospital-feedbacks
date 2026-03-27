import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const UserSchema = new mongoose.Schema({ hospital: mongoose.Schema.Types.ObjectId, hospitalId: String }, { strict: false });
const FeedbackSchema = new mongoose.Schema({ 
    hospital: mongoose.Schema.Types.ObjectId, 
    hospitalId: String,
    positive: Date,
    negative: Date,
    categories: Array
}, { strict: false });
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

        // Migrate Feedbacks (hospitalId + dashboard fields)
        const feedbacks = await Feedback.find({});
        console.log(`Migrating ${feedbacks.length} feedbacks for dashboard compatibility...`);
        for (const fb of feedbacks) {
            if (fb.hospital && !fb.hospitalId) {
                fb.hospitalId = fb.hospital.toString();
            }
            
            // Logic for positive/negative fields based on nested categories
            if (!fb.positive && !fb.negative) {
                const types = fb.categories?.map(c => (c.reviewType || '').toLowerCase()) || [];
                const isPos = types.some(t => ['positive', 'completely_satisfied', 'completely satisfied'].includes(t));
                const isNeg = types.some(t => ['negative', 'needs work', 'needs_work', 'not_satisfied', 'not satisfied'].includes(t));
                
                if (isPos) fb.positive = fb.createdAt || new Date();
                if (isNeg) fb.negative = fb.createdAt || new Date();
            }
            
            await fb.save();
        }

        // Migrate Departments
        const depts = await Department.find({ hospitalId: { $exists: false }, hospital: { $exists: true } });
        console.log(`Migrating ${depts.length} departments...`);
        for (const dept of depts) {
            dept.hospitalId = dept.hospital.toString();
            await dept.save();
        }
        
        console.log('Migration complete');
        await mongoose.disconnect();
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
