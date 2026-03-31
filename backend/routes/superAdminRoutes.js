import express from 'express';
import mongoose from 'mongoose';
import _Hospital from '../models/Hospital.js';
import _User from '../models/User.js';
import _Feedback from '../models/Feedback.js';
import _Department from '../models/Department.js';
import { protect, superAdmin } from './userRoutes.js';
import { sendAdminCredentialsEmail } from '../services/emailService.js';
import { cacheHospitalConfig, invalidateHospitalConfigCache } from '../utils/hospitalConfigCache.js';

const Hospital = _Hospital?.default || _Hospital;
const User = _User?.default || _User;
const Feedback = _Feedback?.default || _Feedback;
const Department = _Department?.default || _Department;

const router = express.Router();

// @desc    Get all hospitals
// @route   GET /api/super-admin/hospitals
router.get('/hospitals', protect, superAdmin, async (req, res) => {
    try {
        const hospitals = await Hospital.find({}).lean();

        // Enhance hospitals with feedback counts
        const enhancedHospitals = await Promise.all(hospitals.map(async (h) => {
            const feedbackCount = await Feedback.countDocuments({ hospitalId: h._id.toString() });
            return {
                ...h,
                feedbackCount
            };
        }));

        res.json(enhancedHospitals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospitals' });
    }
});

// @desc    Get single hospital details
// @route   GET /api/super-admin/hospitals/:id
router.get('/hospitals/:id', protect, superAdmin, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id).lean();
        if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

        const feedbackCount = await Feedback.countDocuments({ hospitalId: hospital._id.toString() });
        res.json({ ...hospital, feedbackCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospital details' });
    }
});

// @desc    Create a new hospital
// @route   POST /api/super-admin/hospitals
router.post('/hospitals', protect, superAdmin, async (req, res) => {
    const { name, location, state, district, phone, adminEmail, adminPassword, departments, adminName, adminPhone, logoUrl, themeColor } = req.body;
    try {
        // 1. Check if admin email is already in use
        if (adminEmail) {
            const cleanEmail = adminEmail.trim().toLowerCase();
            const userExists = await User.findOne({ email: cleanEmail });
            if (userExists) {
                return res.status(400).json({ message: 'Admin email already exists in the system' });
            }
        }

        // 2. Generate uniqueId
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
        const random = Math.floor(Math.random() * 9000) + 1000;
        const uniqueId = `${slug}-${random}`;

        const hospitalExists = await Hospital.findOne({ uniqueId });
        if (hospitalExists) {
            return res.status(400).json({ message: 'Hospital unique ID already exists' });
        }

        // Prepare departments for hospital and Department collection
        const defaultDepts = [
            { name: 'Canteen', description: 'Dining and canteen services', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2082/2082045.png' },
            { name: 'Doctor', description: 'Healthcare staff and doctor services', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png' },
            { name: 'Medicine', description: 'Pharmacy and medical services', imageUrl: 'https://cdn-icons-png.flaticon.com/512/883/883407.png' },
            { name: 'Parking', description: 'Hospital parking facilities', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830175.png' },
        ];

        const depts = (typeof departments === 'string' && departments.trim() !== '')
            ? departments.split(',').map(d => ({ name: d.trim().toUpperCase() }))
            : (departments && departments.length > 0 ? departments : defaultDepts);

        // Final Creation
        const hospital = await Hospital.create({
            name,
            uniqueId,
            qrId: uniqueId,
            location: location || '',
            state: state || '',
            district: district || '',
            phone: phone || '',
            adminEmail: adminEmail ? adminEmail.trim().toLowerCase() : '', // Link admin email to hospital record
            logoUrl: logoUrl || '',
            themeColor: themeColor || '#4338ca',
            departments: depts
        });
        cacheHospitalConfig(hospital);

        // 3a. Create individual Department documents in the Department collection
        if (depts.length > 0) {
            await Promise.all(depts.map(d => 
                Department.create({
                    name: d.name,
                    hospital: hospital._id,
                    hospitalId: hospital._id.toString(),
                    description: d.description || `Standard ${d.name} department`,
                    imageUrl: d.imageUrl || ''
                })
            ));
        }

        // 4. Create Admin User
        if (adminEmail && adminPassword) {
            await User.create({
                name: adminName || `${name} Admin`,
                email: adminEmail?.trim().toLowerCase(),
                password: adminPassword, // Password validation (minLength 6) should be handled by the User model schema
                phone: adminPhone || '',
                role: 'hospital_admin',
                hospital: hospital._id,
                hospitalId: hospital._id.toString()
            });

            // Send Email Notification - Non-blocking to prevent frontend timeouts
            sendAdminCredentialsEmail(
                adminEmail,
                adminName || `${name} Admin`,
                adminEmail,
                adminPassword,
                req
            ).catch(err => console.error('Background Email Failed:', err.message));
        }

        res.status(201).json(hospital);
    } catch (error) {
        console.error('Hospital Enrollment Error:', error);
        let message = 'Error creating hospital';
        
        // Handle MongoDB duplicate key errors (11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            message = `Duplicate Error: A record already exists with this ${field}.`;
            if (field === 'adminEmail' || field === 'email') message = 'This administrator email is already associated with another hospital.';
            if (field === 'qrId' || field === 'uniqueId') message = 'This hospital identifier is already in use. Please try a different name.';
            return res.status(400).json({ message });
        }

        res.status(500).json({ message: error.message || message });
    }
});

// @desc    Toggle hospital status
// @route   PUT /api/super-admin/hospitals/:id/status
router.put('/hospitals/:id/status', protect, superAdmin, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (hospital) {
            hospital.isActive = req.body.isActive !== undefined ? req.body.isActive : !hospital.isActive;
            const updatedHospital = await hospital.save();
            invalidateHospitalConfigCache(updatedHospital);
            cacheHospitalConfig(updatedHospital);
            res.json(updatedHospital);
        } else {
            res.status(404).json({ message: 'Hospital not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
});

// @desc    Create hospital admin
// @route   POST /api/super-admin/hospitals/:id/admin
router.post('/hospitals/:id/admin', protect, superAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        const user = await User.create({
            name,
            email,
            password,
            role: 'Admin',
            hospital: req.params.id,
            hospitalId: req.params.id
        });

        // Send Email Notification - Non-blocking
        sendAdminCredentialsEmail(email, name, email, password, req);

        res.status(201).json({ _id: user._id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Error creating hospital admin' });
    }
});

// @desc    Get all users for a specific hospital
// @route   GET /api/super-admin/hospitals/:id/users
router.get('/hospitals/:id/users', protect, superAdmin, async (req, res) => {
    try {
        const users = await User.find({ hospitalId: req.params.id }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospital staff' });
    }
});

// @desc    Delete a hospital (Cascade delete everything)
// @route   DELETE /api/super-admin/hospitals/:id
router.delete('/hospitals/:id', protect, superAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] SuperAdmin ${req.user.email} is removing hospital: ${id}`);

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid Hospital ID format' });
        }

        const hospital = await Hospital.findById(id);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital records not found in our database' });
        }

        const hName = hospital.name;
        invalidateHospitalConfigCache(hospital);

        // 1. Delete associated Feedbacks
        const fbResult = await Feedback.deleteMany({ hospital: id });
        console.log(`- Deleted ${fbResult.deletedCount} feedback records for ${hName}`);

        // 2. Delete associated Users (Admins, Dept Heads)
        const userResult = await User.deleteMany({ hospital: id, role: { $ne: 'Super_Admin' } });
        console.log(`- Deleted ${userResult.deletedCount} staff accounts for ${hName}`);

        // 3. Delete associated Departments
        const deptResult = await Department.deleteMany({ hospital: id });
        console.log(`- Deleted ${deptResult.deletedCount} departments for ${hName}`);

        // 4. Finally delete the Hospital itself
        await Hospital.findByIdAndDelete(id);
        console.log(`- Successfully removed hospital: ${hName}`);

        res.json({ message: `${hName} and all associated data have been permanently removed.` });
    } catch (error) {
        console.error('CRITICAL Delete error:', error);
        res.status(500).json({
            message: 'A server error occurred while trying to delete the hospital',
            error: error.message
        });
    }
});

export default router;
