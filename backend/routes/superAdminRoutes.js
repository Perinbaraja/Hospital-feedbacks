import express from 'express';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { protect, superAdmin } from './userRoutes.js';

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

// @desc    Create a new hospital
// @route   POST /api/super-admin/hospitals
router.post('/hospitals', protect, superAdmin, async (req, res) => {
    const { name, location, phone, adminEmail, adminPassword, departments, adminName, adminPhone } = req.body;
    try {
        // Generate uniqueId
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
        const random = Math.floor(Math.random() * 9000) + 1000;
        const uniqueId = `${slug}-${random}`;

        const hospitalExists = await Hospital.findOne({ uniqueId });
        if (hospitalExists) {
            return res.status(400).json({ message: 'Hospital unique ID already exists' });
        }

        const hospital = await Hospital.create({
            name,
            uniqueId,
            location,
            phone,
            departments: departments || []
        });

        // Create Admin User for this hospital
        if (adminEmail && adminPassword) {
            const userExists = await User.findOne({ email: adminEmail });
            if (!userExists) {
                await User.create({
                    name: adminName || `${name} Admin`,
                    email: adminEmail,
                    password: adminPassword,
                    phone: adminPhone || '',
                    role: 'Admin',
                    hospital: hospital._id
                });

                // Mock SMS Sending Logic
                console.log(`[SIMULATED SMS] To: ${adminPhone}`);
                console.log(`Message: Your Hospital Admin Dashboard is ready!`);
                console.log(`URL: http://localhost:3000/login`);
                console.log(`Username: ${adminEmail}`);
                console.log(`Password: ${adminPassword}`);
            }
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
        res.status(201).json({ _id: user._id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Error creating hospital admin' });
    }
});

// @desc    Get users for a hospital
// @route   GET /api/super-admin/hospitals/:id/users
router.get('/hospitals/:id/users', protect, superAdmin, async (req, res) => {
    try {
        const users = await User.find({ hospital: req.params.id }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospital users' });
    }
});

export default router;
