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

        const hospital = await Hospital.create({
            name: 'Grand City Hospital',
            uniqueId: 'hosp-01',
            logoUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063224.png',
            departments: [
                { name: 'Kitchen', description: 'Food and dining services' },
                { name: 'Cleanliness', description: 'Hospital hygiene and sanitation' },
                { name: 'Staff', description: 'Staff behavior and support' },
                { name: 'Environment', description: 'General hospital atmosphere' }
            ],
            themeColor: '#0ca678',
            qrId: 'main'
        });

        await User.create([
            {
                name: 'Super Admin',
                email: 'super@hospital.com',
                password: 'superpassword',
                role: 'Super_Admin'
            },
            {
                name: 'Hospital Admin',
                email: 'admin@hospital.com',
                password: 'password123',
                role: 'Admin',
                hospital: hospital._id
            },
            {
                name: 'Head Chef',
                email: 'kitchen@hospital.com',
                password: 'password123',
                role: 'Dept_Head',
                department: 'Kitchen',
                hospital: hospital._id
            }
        ]);

        console.log('Database seeded successfully:');
        console.log('Super Admin: super@hospital.com / superpassword');
        console.log('Hospital Admin: admin@hospital.com / password123');
        console.log('Dept Head (Kitchen): kitchen@hospital.com / password123');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedDatabase();
