import express from 'express';
import multer from 'multer';
import path from 'path';
import Hospital from '../models/Hospital.js';
import { protect, admin } from './userRoutes.js';

const router = express.Router();

// Multer Storage Configuration (Reuse pattern from feedbackRoutes)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `config-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Images only (jpeg, jpg, png, webp)!'));
    },
});

// @desc    Get hospital config
router.get('/', async (req, res) => {
    const { hospitalId, qrId } = req.query;
    try {
        let hospital;
        if (hospitalId) {
            hospital = await Hospital.findById(hospitalId);
        } else if (qrId) {
            hospital = await Hospital.findOne({ qrId });
        } else {
            hospital = await Hospital.findOne({});
        }

        res.json(hospital);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hospital settings' });
    }
});

// @desc    Upload an image for config (e.g., Logo)
// @route   POST /api/hospital/upload
router.post('/upload', protect, admin, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// @desc    Update hospital config
router.put('/', protect, admin, async (req, res) => {
    const { name, logoUrl, departments, themeColor, qrId } = req.body;
    const { hospitalId } = req.query;

    try {
        let hospital;
        if (hospitalId && req.user.role === 'Super_Admin') {
            hospital = await Hospital.findById(hospitalId);
        } else {
            hospital = await Hospital.findOne({});
        }

        if (hospital) {
            hospital.name = name || hospital.name;
            hospital.logoUrl = logoUrl !== undefined ? logoUrl : hospital.logoUrl;
            hospital.departments = departments || hospital.departments;
            if (themeColor !== undefined) hospital.themeColor = themeColor;
            if (qrId !== undefined) hospital.qrId = qrId;

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
