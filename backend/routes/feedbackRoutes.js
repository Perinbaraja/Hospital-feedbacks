import express from 'express';
import Feedback from '../models/Feedback.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin } from './userRoutes.js';

import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    },
});

// @desc    Submit new feedback
// @route   POST /api/feedback
router.post('/', upload.any(), async (req, res) => {
    try {
        const { patientName, patientEmail, categories: categoriesRaw, comments } = req.body;
        const categories = JSON.parse(categoriesRaw);

        const createdFeedbacks = [];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];

            // Check if there's an image for this category
            // We'll look for a file field named like `image_${i}`
            const file = req.files.find(f => f.fieldname === `image_${i}`);

            const feedback = new Feedback({
                patientName,
                patientEmail,
                categories: [{
                    ...cat,
                    image: file ? `/uploads/${file.filename}` : null
                }],
                comments,
                assignedTo: null, // Keep empty initially so admin sees "Assign"
                status: 'Pending',
                hospital: req.body.hospital
            });

            const saved = await feedback.save();
            createdFeedbacks.push(saved);
        }

        if (patientEmail) {
            sendThankYouEmail(patientEmail, patientName);
        }

        res.status(201).json(createdFeedbacks);
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
});

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
router.get('/', protect, admin, async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'Admin') {
            filter.hospital = req.user.hospital;
        }
        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Get feedback for specific department (Dept Head)
// @route   GET /api/feedback/department/:dept
router.get('/department/:dept', protect, async (req, res) => {
    try {
        // Only allow head of their own dept unless admin
        if (req.user.role !== 'Admin' && req.user.department !== req.params.dept) {
            return res.status(403).json({ message: 'Not authorized for this department view' });
        }
        const feedbacks = await Feedback.find({ assignedTo: req.params.dept }).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Update feedback (Admin)
// @route   PUT /api/feedback/:id
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (feedback) {
            if (req.body.assignedTo !== undefined) {
                feedback.assignedTo = req.body.assignedTo;
                // If assignedTo is set to a non-empty string, move to IN PROGRESS. If cleared, go back to Pending.
                const newStatus = (req.body.assignedTo && req.body.assignedTo.trim() !== '') ? 'IN PROGRESS' : 'Pending';

                // Only change status automatically if it's currently Pending or IN PROGRESS (don't revert COMPLETED)
                if (feedback.status !== 'COMPLETED') {
                    feedback.status = newStatus;
                }
            }

            if (req.body.status !== undefined) {
                feedback.status = req.body.status;
                if (req.body.status === 'COMPLETED' && feedback.patientEmail) {
                    sendResolutionEmail(feedback.patientEmail, feedback.patientName);
                }
            }

            if (req.body.categoryUpdate) {
                const { department, reviewType } = req.body.categoryUpdate;
                if (feedback.categories && feedback.categories.length > 0) {
                    if (department) {
                        feedback.categories[0].department = department;
                    }
                    if (reviewType) {
                        feedback.categories[0].reviewType = reviewType;
                    }
                    feedback.markModified('categories');
                }
                // When admin manually updates category, move to IN PROGRESS if it was Pending
                if (feedback.status === 'Pending') {
                    feedback.status = 'IN PROGRESS';
                }
            }

            const updatedFeedback = await feedback.save();
            res.json(updatedFeedback);
        } else {
            res.status(404).json({ message: 'Feedback not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating feedback' });
    }
});

// @desc    Delete feedback (Admin)
// @route   DELETE /api/feedback/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (feedback) {
            await feedback.deleteOne();
            res.json({ message: 'Feedback removed' });
        } else {
            res.status(404).json({ message: 'Feedback not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error removing feedback' });
    }
});

export default router;
