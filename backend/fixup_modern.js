import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import Department from './models/Department.js';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const fixup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitalId = '69ba3e22deaa22d70c2fe3d8';
        const h = await Hospital.findById(hospitalId);
        
        if (!h) {
            console.log('Modern Hospital not found');
            process.exit(1);
        }

        console.log('Fixing Modern Hospital:', h.name);

        // 1. Create missing Department documents
        const existingNames = ['MEDICINES', 'CANTEEN', 'DOCTOR', 'PARKING'];
        for (const name of existingNames) {
            const exists = await Department.findOne({ name, hospital: hospitalId });
            if (!exists) {
                await Department.create({
                    name,
                    hospital: hospitalId,
                    description: `Department for ${h.name}`,
                    imageUrl: '' // Fallback
                });
                console.log(`- Created Department: ${name}`);
            } else {
                console.log(`- Department already exists: ${name}`);
            }
        }

        // 2. Fix Admin User
        // Delete any existing modern admin placeholders to avoid confusion
        await User.deleteMany({ email: /modern@hospital.com|moder@hospital.com/i });
        
        // Ensure erajivv@gmail.com is set up correctly
        const email = 'erajivv@gmail.com';
        let user = await User.findOne({ email });
        if (user) {
            user.hospital = hospitalId;
            user.role = 'hospital_admin';
            user.password = 'modernhospital';
            await user.save();
            console.log(`- Updated existing user ${email} to admin of Modern Hospital`);
        } else {
            await User.create({
                name: 'Modern Admin',
                email,
                password: 'modernhospital',
                role: 'hospital_admin',
                hospital: hospitalId
            });
            console.log(`- Created new user ${email} as admin of Modern Hospital`);
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fixup();
