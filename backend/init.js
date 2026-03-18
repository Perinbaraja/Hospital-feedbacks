#!/usr/bin/env node
/**
 * Hospital Feedback System - Setup Script
 * This script initializes the database with default hospital and admin users
 * Run this once when setting up the project for the first time
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Hospital from './models/Hospital.js';

import path from 'path';

// Load environment variables
dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(path.resolve(), '.env') });
}

const initializeDatabase = async () => {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Check if hospital already exists
        const existingHospital = await Hospital.findOne({});
        if (existingHospital) {
            console.log('⚠️  Hospital already exists. Skipping initialization.');
            console.log(`   Hospital Name: ${existingHospital.name}`);
            console.log(`   Hospital ID: ${existingHospital._id}`);
            await mongoose.disconnect();
            process.exit(0);
        }

        // Create default hospital
        console.log('📋 Creating default hospital...');
        const hospital = await Hospital.create({
            name: 'Grand City Hospital',
            uniqueId: 'hosp-' + Date.now(),
            logoUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063224.png',
            departments: [
                {
                    name: 'Kitchen',
                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/1995/1995521.png',
                    description: 'Food and dining services',
                    positiveIssues: ['Clean kitchen', 'Good hygiene'],
                    negativeIssues: ['Food quality', 'Slow service']
                },
                {
                    name: 'Cleanliness',
                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/3050/3050159.png',
                    description: 'Hospital hygiene and sanitation',
                    positiveIssues: ['Clean floors', 'Fresh environment'],
                    negativeIssues: ['Dusty areas', 'Dirty bathrooms']
                },
                {
                    name: 'Staff',
                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/747/747376.png',
                    description: 'Staff behavior and support',
                    positiveIssues: ['Helpful staff', 'Professional'],
                    negativeIssues: ['Rude behavior', 'Slow response']
                },
                {
                    name: 'Environment',
                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/3050/3050146.png',
                    description: 'General hospital atmosphere',
                    positiveIssues: ['Comfortable rooms', 'Good temperature'],
                    negativeIssues: ['Noisy', 'Uncomfortable beds']
                }
            ],
            themeColor: '#0ca678',
            qrId: 'main',
            location: 'City Center',
            phone: '+1 (555) 123-4567',
            adminEmail: 'admin@hospital.com'
        });

        console.log(`✅ Hospital created: ${hospital.name}`);
        console.log(`   Hospital ID: ${hospital._id}`);

        // Create default users
        console.log('👤 Creating default users...');
        await User.create([
            {
                name: 'Super Admin',
                email: 'super@hospital.com',
                password: 'superpassword',
                role: 'Super_Admin',
                isActive: true
            },
            {
                name: 'Hospital Admin',
                email: 'admin@hospital.com',
                password: 'password123',
                role: 'Admin',
                hospital: hospital._id,
                isActive: true
            },
            {
                name: 'Kitchen Head',
                email: 'kitchen@hospital.com',
                password: 'password123',
                role: 'Dept_Head',
                department: 'Kitchen',
                hospital: hospital._id,
                isActive: true
            },
            {
                name: 'Cleanliness Head',
                email: 'clean@hospital.com',
                password: 'password123',
                role: 'Dept_Head',
                department: 'Cleanliness',
                hospital: hospital._id,
                isActive: true
            }
        ]);

        console.log('✅ Default users created');
        console.log('\n📝 Login Credentials:');
        console.log('   Super Admin:');
        console.log('     Email: super@hospital.com');
        console.log('     Password: superpassword');
        console.log('');
        console.log('   Hospital Admin:');
        console.log('     Email: admin@hospital.com');
        console.log('     Password: password123');
        console.log('');
        console.log('   Kitchen Department Head:');
        console.log('     Email: kitchen@hospital.com');
        console.log('     Password: password123');
        console.log('');
        console.log('   Cleanliness Department Head:');
        console.log('     Email: clean@hospital.com');
        console.log('     Password: password123');
        console.log('\n✅ Database initialization complete!');
        console.log('🚀 You can now start the application.\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during initialization:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

initializeDatabase();
