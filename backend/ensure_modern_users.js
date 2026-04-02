import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import User from './models/User.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const fix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitalId = '69ba3e22deaa22d70c2fe3d8'; // MODERN HOSPITAL
        const emails = ['modern@hospital.com', 'erajivv@gmail.com'];
        
        for (const email of emails) {
            const user = await User.findOne({ email });
            if (!user) {
                 await User.create({
                    name: 'Hospital Admin',
                    email: email,
                    password: 'password123',
                    role: 'hospital_admin',
                    hospital: hospitalId
                });
                console.log(`Created user: ${email}`);
            } else {
                user.hospital = hospitalId;
                user.role = 'hospital_admin';
                await user.save();
                console.log(`Ensured user exists: ${email}`);
            }
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fix();
