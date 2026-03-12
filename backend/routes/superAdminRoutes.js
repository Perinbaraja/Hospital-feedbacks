import express from 'express';
import mongoose from 'mongoose';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { protect, superAdmin } from './userRoutes.js';
import { sendAdminCredentialsEmail } from '../services/emailService.js';

const router = express.Router();

// @desc    Get all hospitals
// @route   GET /api/super-admin/hospitals
router.get('/hospitals', protect, superAdmin, async (req, res) => {
    try {
        const hospitals = await Hospital.find({}).lean();

        // Enhance hospitals with feedback counts
        const enhancedHospitals = await Promise.all(hospitals.map(async (h) => {
            const feedbackCount = await Feedback.countDocuments({ hospital: h._id });
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

        const feedbackCount = await Feedback.countDocuments({ hospital: hospital._id });
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
            const userExists = await User.findOne({ email: adminEmail });
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

        // 3. Create Hospital
        const hospital = await Hospital.create({
            name,
            uniqueId,
            qrId: uniqueId,
            location,
            state: state || '',
            district: district || '',
            phone,
            logoUrl: logoUrl || '',
            themeColor: themeColor || '#4338ca',
            departments: typeof departments === 'string'
                ? departments.split(',').map(d => d.trim()).filter(d => d !== '')
                : (departments || [])
        });

        // 4. Create Admin User
        if (adminEmail && adminPassword) {
            await User.create({
                name: adminName || `${name} Admin`,
                email: adminEmail,
                password: adminPassword,
                phone: adminPhone || '',
                role: 'hospital_admin',
                hospital: hospital._id
            });

            // Send Email Notification
            await sendAdminCredentialsEmail(
                adminEmail,
                adminName || `${name} Admin`,
                adminEmail,
                adminPassword
            );
        }

        res.status(201).json(hospital);
    } catch (error) {
        res.status(500).json({ message: 'Error creating hospital' });
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
            hospital: req.params.id
        });

        // Send Email Notification
        await sendAdminCredentialsEmail(email, name, email, password);

        res.status(201).json({ _id: user._id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Error creating hospital admin' });
    }
});

// @desc    Get all users for a specific hospital
// @route   GET /api/super-admin/hospitals/:id/users
router.get('/hospitals/:id/users', protect, superAdmin, async (req, res) => {
    try {
        const users = await User.find({ hospital: req.params.id }).select('-password');
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

        // 1. Delete associated Feedbacks
        const fbResult = await Feedback.deleteMany({ hospital: id });
        console.log(`- Deleted ${fbResult.deletedCount} feedback records for ${hName}`);

        // 2. Delete associated Users (Admins, Dept Heads)
        const userResult = await User.deleteMany({ hospital: id });
        console.log(`- Deleted ${userResult.deletedCount} staff accounts for ${hName}`);

        // 3. Finally delete the Hospital itself
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
