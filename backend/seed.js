import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB Connected'));

const seedDatabase = async () => {
    try {
        await User.deleteMany();
        await Hospital.deleteMany();

        await Hospital.create({
            name: 'Grand City Hospital',
            logoUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063224.png',
            departments: ['Kitchen', 'Cleanliness', 'Staff', 'Environment']
        });

        await User.create([
            {
                name: 'Master Admin',
                email: 'admin@hospital.com',
                password: 'password123',
                role: 'Admin'
            },
            {
                name: 'Head Chef',
                email: 'kitchen@hospital.com',
                password: 'password123',
                role: 'Dept_Head',
                department: 'Kitchen'
            }
        ]);

        console.log('Database seeded with test accounts:');
        console.log('Admin: admin@hospital.com / password123');
        console.log('Dept Head (Kitchen): kitchen@hospital.com / password123');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedDatabase();
