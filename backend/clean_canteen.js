import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';

dotenv.config();

const cleanCanteen = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ email: 'canteen@hospital.com' });
        if (user) {
            console.log('Original User:', JSON.stringify(user, null, 2));

            // Explicitly clean fields
            user.role = 'Dept_Head';
            user.department = 'CANTEEN';
            user.isActive = true;
            user.password = 'password123';

            await user.save();
            console.log('User cleaned and saved.');
        } else {
            console.log('Canteen user not found.');
        }

        const hosp = await Hospital.findOne({ name: 'Grand City Hospital' });
        if (hosp) {
            console.log('Hospital Found:', hosp.name, 'Active:', hosp.isActive);
            hosp.isActive = true;
            await hosp.save();
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

cleanCanteen();
