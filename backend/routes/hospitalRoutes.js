import express from 'express';
import Hospital from '../models/Hospital.js';
import { protect, admin } from './userRoutes.js';

const router = express.Router();

// @desc    Get hospital config (Public for rendering feedback form)
// @route   GET /api/hospital
router.get('/', async (req, res) => {
    try {
        let hospital = await Hospital.findOne({});
        if (!hospital) {
            // Create seed default
            hospital = await Hospital.create({
                name: 'My Custom Hospital',
                departments: ['Kitchen', 'Cleanliness', 'Staff', 'Environment']
            });
        }
        res.json(hospital);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospital settings' });
    }
});

// @desc    Update hospital config (Admin only)
// @route   PUT /api/hospital
router.put('/', protect, admin, async (req, res) => {
    const { name, logoUrl, departments } = req.body;

    try {
        let hospital = await Hospital.findOne({});

        if (hospital) {
            hospital.name = name || hospital.name;
            hospital.logoUrl = logoUrl !== undefined ? logoUrl : hospital.logoUrl;
            hospital.departments = departments || hospital.departments;

            const updatedHospital = await hospital.save();
            res.json(updatedHospital);
        } else {
            const createdHospital = await Hospital.create({ name, logoUrl, departments });
            res.status(201).json(createdHospital);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating hospital settings' });
    }
});

export default router;
