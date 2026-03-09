import express from 'express';
import Feedback from '../models/Feedback.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin } from './userRoutes.js';
import { validateFeedbackInput } from '../middleware/validation.js';

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
router.post('/', upload.any(), validateFeedbackInput, async (req, res) => {
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

// @desc    Track feedback status (Public)
// @route   GET /api/feedback/track/:id
router.get('/track/:id', async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .select('status patientName createdAt hospital')
            .populate('hospital', 'name themeColor');

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: 'Error tracking feedback' });
    }
});

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
router.get('/', protect, admin, async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'Admin') {
            filter.hospital = req.user.hospital;
        } else if (req.user.role === 'Super_Admin' && req.query.hospitalId) {
            filter.hospital = req.query.hospitalId;
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
        const deptName = req.params.dept?.trim();

        // Only allow head of their own dept unless admin (case-insensitive check)
        if (req.user.role !== 'Admin' && req.user.department?.trim().toLowerCase() !== deptName?.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized for this department view' });
        }
        // Use regex to match the department name within a potentially comma-separated list
        const feedbacks = await Feedback.find({
            assignedTo: { $regex: deptName, $options: 'i' }
        }).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Update feedback (Admin & Assigned Dept Head)
// @route   PUT /api/feedback/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super_Admin';
        const isAssignedDeptHead = req.user.role === 'Dept_Head' &&
            feedback.assignedTo?.toLowerCase().trim() === req.user.department?.toLowerCase().trim();

        if (!isAdmin && !isAssignedDeptHead) {
            return res.status(403).json({ message: 'Not authorized to update this feedback' });
        }

        // --- Role-Based Permission Logic ---

        // 1. Updating 'assignedTo' and 'categories' is ONLY for Admins
        if (req.body.assignedTo !== undefined || req.body.categoryUpdate !== undefined) {
            if (!isAdmin) {
                return res.status(403).json({ message: 'Only admins can modify assignments or categories' });
            }

            if (req.body.assignedTo !== undefined) {
                feedback.assignedTo = req.body.assignedTo;
                // If assignedTo is cleared, revert to Pending (unless already COMPLETED)
                if (feedback.status !== 'COMPLETED') {
                    if (req.body.assignedTo && req.body.assignedTo.trim() !== '') {
                        feedback.status = 'IN PROGRESS';
                    } else {
                        feedback.status = 'Pending';
                    }
                }
            }

            if (req.body.categoryUpdate) {
                const { department, reviewType, issue } = req.body.categoryUpdate;
                if (feedback.categories && feedback.categories.length > 0) {
                    if (department) feedback.categories[0].department = department;
                    if (reviewType) feedback.categories[0].reviewType = reviewType;
                    if (issue) {
                        feedback.categories[0].issue = Array.isArray(issue) ? issue : issue.split(',').map(s => s.trim()).filter(s => s);
                    }
                    feedback.markModified('categories');
                }
                // Only move to IN PROGRESS on category update if we actually have an assignment
                if (feedback.status === 'Pending' && feedback.assignedTo && feedback.assignedTo.trim() !== '') {
                    feedback.status = 'IN PROGRESS';
                }
            }
        }

        // 2. Updating 'status' is allowed for both Admins and the Assigned Dept Head
        if (req.body.status !== undefined) {
            // Check if Dept_Head is trying to do something weird
            if (isAssignedDeptHead && req.body.status !== 'COMPLETED') {
                // Dept heads usually only mark as COMPLETED/Resolved
                // But we'll allow it for now unless restricted
            }

            feedback.status = req.body.status;
            if (req.body.status === 'COMPLETED' && feedback.patientEmail) {
                sendResolutionEmail(feedback.patientEmail, feedback.patientName);
            }
        }

        const updatedFeedback = await feedback.save();
        res.json(updatedFeedback);
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Error updating feedback' });
    }
});

// @desc    Add internal note (Admin & Assigned Dept Head)
// @route   POST /api/feedback/:id/notes
router.post('/:id/notes', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

        const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super_Admin';
        const isAssignedDeptHead = req.user.role === 'Dept_Head' && feedback.assignedTo === req.user.department;

        if (!isAdmin && !isAssignedDeptHead) {
            return res.status(403).json({ message: 'Not authorized to add notes to this feedback' });
        }

        const note = {
            text: req.body.text,
            senderName: req.user.name,
            senderRole: req.user.role,
        };

        if (!note.text) return res.status(400).json({ message: 'Note text is required' });

        feedback.notes.push(note);
        await feedback.save();

        res.status(201).json(feedback.notes);
    } catch (error) {
        res.status(500).json({ message: 'Error adding internal note' });
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
