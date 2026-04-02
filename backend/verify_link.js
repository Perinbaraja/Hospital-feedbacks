import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import User from './models/User.js';

dotenv.config();

const verifyHospitalLink = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'canteen@hospital.com' });
        if (user) {
            console.log('User Found. Linking Hospital ID:', user.hospital);
            const hosp = await Hospital.findById(user.hospital);
            if (hosp) {
                console.log('Hospital Found:', hosp.name);
            } else {
                console.log('HOSPITAL NOT FOUND FOR THIS ID!');
                // Fix it by finding the right one
                const realHosp = await Hospital.findOne({ name: 'Grand City Hospital' });
                if (realHosp) {
                    user.hospital = realHosp._id;
                    await user.save();
                    console.log('Link fixed to:', realHosp.name, realHosp._id);
                }
            }
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verifyHospitalLink();
