import express from 'express';
import Feedback from '../models/Feedback.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin } from './userRoutes.js';
import { validateFeedbackInput } from '../middleware/validation.js';


const router = express.Router();


// @desc    Submit new feedback
// @route   POST /api/feedback
router.post('/', validateFeedbackInput, async (req, res) => {
    try {
        const { patientName, patientEmail, categories, comments, hospital } = req.body;

        const createdFeedbacks = [];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const issueList = Array.isArray(cat.issue) ? cat.issue : [];

            const feedback = await Feedback.create({
                patientName,
                patientEmail,
                hospital,
                comments,
                categories: [{
                    department: cat.department,
                    issue: issueList,
                    customText: cat.customText,
                    reviewType: cat.reviewType,
                    rating: cat.rating,
                    image: cat.image // This is now a Base64 string from the frontend
                }],
                status: 'Pending',
                assignedTo: cat.department
            });
            createdFeedbacks.push(feedback);
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
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        if (isAdmin) {
            filter.hospital = req.user.hospital;
        } else if (isSuperAdmin && req.query.hospitalId) {
            filter.hospital = req.query.hospitalId;
        }
        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Get feedback stats (Admin)
// @route   GET /api/feedback/stats
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const filter = {};
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        if (isAdmin) {
            filter.hospital = req.user.hospital;
        } else if (isSuperAdmin && req.query.hospitalId) {
            filter.hospital = req.query.hospitalId;
        }

        const total = await Feedback.countDocuments(filter);
        const pending = await Feedback.countDocuments({ ...filter, status: 'Pending' });
        const inProgress = await Feedback.countDocuments({ ...filter, status: 'IN PROGRESS' });
        const completed = await Feedback.countDocuments({ ...filter, status: 'COMPLETED' });

        // Calculate Average Rating / Positive Ratio
        const allFeedbacks = await Feedback.find(filter).select('categories');
        let positiveCount = 0;
        let negativeCount = 0;
        const deptDistribution = {};

        allFeedbacks.forEach(fb => {
            const cat = fb.categories?.[0] || {};
            if (cat.reviewType === 'Positive') positiveCount++;
            else if (cat.reviewType === 'Negative') negativeCount++;

            if (cat.department) {
                deptDistribution[cat.department] = (deptDistribution[cat.department] || 0) + 1;
            }
        });

        res.json({
            total,
            pending,
            inProgress,
            completed,
            positiveCount,
            negativeCount,
            deptDistribution
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// @desc    Get feedback for specific department (Dept Head)
// @route   GET /api/feedback/department/:dept
router.get('/department/:dept', protect, async (req, res) => {
    try {
        const deptName = req.params.dept?.trim();

        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';

        // Only allow head of their own dept unless admin (case-insensitive check)
        if (!isAdmin && req.user.department?.trim().toLowerCase() !== deptName?.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized for this department view' });
        }
        // Use regex to match the department name within a potentially comma-separated list
        const feedbacks = await Feedback.find({
            assignedTo: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
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

        if (req.user.role !== 'Super_Admin' && feedback.hospital?.toString() !== req.user.hospital?.toString()) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
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

        if (req.user.role !== 'Super_Admin' && feedback.hospital?.toString() !== req.user.hospital?.toString()) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

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

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        const isSuper = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        if (!isSuper && feedback.hospital?.toString() !== req.user.hospital?.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this feedback' });
        }

        await feedback.deleteOne();
        res.json({ message: 'Feedback removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing feedback' });
    }
});

export default router;
