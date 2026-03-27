import express from 'express';
import mongoose from 'mongoose';
import _Hospital from '../models/Hospital.js';
import _Department from '../models/Department.js';
import { protect, admin, optionalProtect } from './userRoutes.js';
import { validateHospitalInput } from '../middleware/validation.js';

const Hospital = _Hospital?.default || _Hospital;
const Department = _Department?.default || _Department;
const router = express.Router();

// @desc    Get hospital config
router.get('/', optionalProtect, async (req, res) => {
    const { hospitalId, qrId } = req.query;
    try {
        let hospital;
        if (qrId) {
            hospital = await Hospital.findOne({ qrId });
        } else if (hospitalId) {
            if (mongoose.Types.ObjectId.isValid(hospitalId)) {
                hospital = await Hospital.findById(hospitalId);
            } else {
                // If not an ObjectId, assume it's a uniqueId slug
                hospital = await Hospital.findOne({ uniqueId: hospitalId });
            }
        } else if (req.user && req.user.hospitalId) {
            // Priority: Authenticated Admin's assigned hospital
            hospital = await Hospital.findById(req.user.hospitalId);
        } else {
            return res.status(400).json({ message: 'Hospital ID or QR ID required' });
        }

        // If no hospital found, return error with appropriate status
        if (!hospital) {
            console.warn(`[Hospital Config] Hospital not found for qrId: ${qrId} or hospitalId: ${hospitalId}`);
            return res.status(404).json({ message: 'Hospital not found. Please ensure hospital is initialized.' });
        }

        // If deactivated, block access. 
        // Note: We block even Super Admins from the PUBLIC feedback view if it's deactivated 
        // to avoid confusion, but protected admin routes remain accessible via their own routes.
        // If deactivated, block access for everyone except Super Admins
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';
        
        if (hospital.isActive === false && !isSuperAdmin) {
            console.log(`[Hospital Config] Access denied: ${hospital.name} is deactivated.`);
            return res.status(403).json({ 
                message: 'This hospital\'s feedback portal is currently deactivated by the network administrator.',
                isDeactivated: true 
            });
        }

        res.json(hospital);
    } catch (error) {
        console.error('Error fetching hospital settings:', error.message);
        res.status(500).json({ message: 'Error fetching hospital settings' });
    }
});
// @desc    Update hospital config
router.put('/', protect, admin, validateHospitalInput, async (req, res) => {
    const { name, logoUrl, departments, themeColor, qrId, location, state, district, feedbackBgUrl, phone } = req.body;
    const { hospitalId } = req.query;

    try {
        let hospital;
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';
        if (isSuperAdmin && hospitalId) {
            hospital = await Hospital.findById(hospitalId);
        } else {
            // Normal Admin: Update their own hospital!
            hospital = await Hospital.findById(req.user.hospitalId);
        }

        if (hospital) {
            hospital.name = name || hospital.name;
            hospital.logoUrl = logoUrl !== undefined ? logoUrl : hospital.logoUrl;
            hospital.departments = departments !== undefined ? departments : hospital.departments;
            if (themeColor !== undefined) hospital.themeColor = themeColor;
            if (qrId !== undefined && qrId !== hospital.qrId) {
                const qrExists = await Hospital.findOne({ qrId });
                if (qrExists) {
                    return res.status(400).json({ message: 'QR ID already in use. Please generate a different one.' });
                }
                hospital.qrId = qrId;
            }

            // New metadata fields
            if (location !== undefined) hospital.location = location;
            if (state !== undefined) hospital.state = state;
            if (district !== undefined) hospital.district = district;
            if (feedbackBgUrl !== undefined) hospital.feedbackBgUrl = feedbackBgUrl;
            if (phone !== undefined) hospital.phone = phone;

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

// @desc    Update TV Dashboard Filters
// @route   PUT /api/hospital/tv-filters
router.put('/tv-filters', protect, admin, async (req, res) => {
    const { feedbackIds, departments, type, comment, dateFrom, dateTo, status, visibleColumns } = req.body;
    const { hospitalId } = req.query;

    try {
        let hospital;
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';
        if (isSuperAdmin && hospitalId) {
            hospital = await Hospital.findById(hospitalId);
        } else {
            hospital = await Hospital.findById(req.user.hospitalId);
        }

        if (hospital) {
            hospital.tvFilters = {
                feedbackIds: Array.isArray(feedbackIds) ? feedbackIds : [],
                departments: Array.isArray(departments) ? departments : [],
                type: type || '',
                comment: comment || '',
                dateFrom: dateFrom || '',
                dateTo: dateTo || '',
                status: status || 'IN PROGRESS',
                visibleColumns: Array.isArray(visibleColumns) ? visibleColumns : []
            };

            const updatedHospital = await hospital.save();
            res.json(updatedHospital.tvFilters);
        } else {
            res.status(404).json({ message: 'Hospital not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating TV filters' });
    }
});

export default router;
