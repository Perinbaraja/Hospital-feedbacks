import express from 'express';
import Hospital from '../models/Hospital.js';
import { protect, admin, optionalProtect } from './userRoutes.js';
import { validateHospitalInput } from '../middleware/validation.js';

const router = express.Router();

// @desc    Get hospital config
router.get('/', optionalProtect, async (req, res) => {
    const { hospitalId, qrId } = req.query;
    try {
        let hospital;
        if (qrId) {
            hospital = await Hospital.findOne({ qrId });
        } else if (hospitalId) {
            hospital = await Hospital.findById(hospitalId);
        } else if (req.user && req.user.hospital) {
            // Priority: Authenticated Admin's assigned hospital
            hospital = await Hospital.findById(req.user.hospital);
        } else {
            // Fallback for public access (QR scan) or when ID is omitted
            hospital = await Hospital.findOne({});
        }

        // If no hospital found, return error with appropriate status
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found. Please ensure hospital is initialized.' });
        }

        res.json(hospital);
    } catch (error) {
        console.error('Error fetching hospital settings:', error.message);
        res.status(500).json({ message: 'Error fetching hospital settings' });
    }
});
// @desc    Update hospital config
router.put('/', protect, admin, validateHospitalInput, async (req, res) => {
    const { name, logoUrl, departments, themeColor, qrId, location, state, district, feedbackBgUrl } = req.body;
    const { hospitalId } = req.query;

    try {
        let hospital;
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';
        if (isSuperAdmin && hospitalId) {
            hospital = await Hospital.findById(hospitalId);
        } else {
            // Normal Admin: Update their own hospital!
            hospital = await Hospital.findById(req.user.hospital);
        }

        if (hospital) {
            hospital.name = name || hospital.name;
            hospital.logoUrl = logoUrl !== undefined ? logoUrl : hospital.logoUrl;
            hospital.departments = departments !== undefined ? departments : hospital.departments;
            if (themeColor !== undefined) hospital.themeColor = themeColor;
            if (qrId !== undefined) hospital.qrId = qrId;

            // New metadata fields
            if (location !== undefined) hospital.location = location;
            if (state !== undefined) hospital.state = state;
            if (district !== undefined) hospital.district = district;
            if (feedbackBgUrl !== undefined) hospital.feedbackBgUrl = feedbackBgUrl;

            const updatedHospital = await hospital.save();
            res.json(updatedHospital);
        } else {
            res.status(404).json({ message: 'Hospital not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating hospital settings' });
    }
});

export default router;
