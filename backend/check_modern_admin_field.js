import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import path from 'path';

dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const h = await Hospital.findOne({ name: /MODERN/i });
        if (h) {
            console.log(`Hospital Found: ${h.name}`);
            console.log(`Admin Email in Doc: ${h.adminEmail || 'NOT SET'}`);
        } else {
            console.log('Hospital not found.');
        }
        process.exit();
    } catch (e) {
        process.exit(1);
    }
};

check();
