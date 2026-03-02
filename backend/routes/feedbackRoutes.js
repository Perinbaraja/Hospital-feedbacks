import express from 'express';
import Feedback from '../models/Feedback.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin } from './userRoutes.js';

const router = express.Router();

// @desc    Submit new feedback
// @route   POST /api/feedback
router.post('/', async (req, res) => {
    const { patientName, patientEmail, categories, comments } = req.body;

    try {
        // Since each category targets a specific department, 
        // We'll create separate feedback tickets for each selected department 
        // to automatically route correctly to Department Heads.
        const createdFeedbacks = [];

        for (const cat of categories) {
            const feedback = new Feedback({
                patientName,
                patientEmail,
                categories: [cat], // Attach just the single requested feedback category
                comments,
                assignedTo: cat.department, // Auto-assign to the department
                status: 'IN PROGRESS'       // Auto start the workflow
            });
            const saved = await feedback.save();
            createdFeedbacks.push(saved);
        }

        if (patientEmail) {
            // Send async email without blocking request
            sendThankYouEmail(patientEmail, patientName);
        }

        res.status(201).json(createdFeedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
});

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
router.get('/', protect, admin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
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

// @desc    Assign to department or Update Status
// @route   PUT /api/feedback/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (feedback) {
            if (req.body.assignedTo !== undefined) {
                feedback.assignedTo = req.body.assignedTo;
                feedback.status = 'IN PROGRESS';
                // Only admin should assign
                if (req.user.role !== 'Admin') {
                    return res.status(403).json({ message: 'Only admin can assign tasks' });
                }
            }

            if (req.body.status !== undefined) {
                feedback.status = req.body.status;

                if (req.body.status === 'COMPLETED' && feedback.patientEmail) {
                    sendResolutionEmail(feedback.patientEmail, feedback.patientName);
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
