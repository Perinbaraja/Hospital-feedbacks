import express from 'express';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Hospital from '../models/Hospital.js';
import Department from '../models/Department.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin, staff } from './userRoutes.js';
import { validateFeedbackInput } from '../middleware/validation.js';
import { generateFeedbackId } from '../utils/idGenerator.js';


const router = express.Router();


// @desc    Submit new feedback
// @route   POST /api/feedback
router.post('/', validateFeedbackInput, async (req, res) => {
    try {
        const { patientName, patientEmail, categories, comments, hospital } = req.body;

        // Verify hospital is active before accepting feedback
        const targetHospital = await Hospital.findById(hospital);
        if (!targetHospital || targetHospital.isActive === false) {
            console.warn(`[Feedback Submission] Denied: Hospital ${hospital} is inactive or not found.`);
            return res.status(403).json({ message: 'Feedback submission is currently disabled for this facility.' });
        }

        const createdFeedbacks = [];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const issueList = Array.isArray(cat.issue) ? cat.issue : [];

            const fId = await generateFeedbackId();

            const feedback = await Feedback.create({
                feedbackId: fId,
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
                status: 'IN PROGRESS',
                assignedTo: cat.department
            });
            createdFeedbacks.push(feedback);
        }

        console.log(`[Feedback Submission] Received from: ${patientName || 'Anonymous'}, Email: ${patientEmail || 'None'}`);

        if (patientEmail && patientEmail.trim() !== '') {
            console.log(`[Feedback Submission] Triggering Thank You email to: ${patientEmail}`);
            // Fire and forget, but with catch for logging
            sendThankYouEmail(patientEmail.trim(), patientName || 'User')
                .then(result => {
                    if (result.success) {
                        console.log(`[Feedback Submission] Email success: ${patientEmail}`);
                    } else {
                        console.error(`[Feedback Submission] Email failed: ${result.error || result.reason}`);
                    }
                })
                .catch(err => console.error(`[Feedback Submission] Email error: ${err.message}`));
        } else {
            console.log('[Feedback Submission] No valid email provided, skipping notification.');
        }

        res.status(201).json(createdFeedbacks);
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
});


// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
router.get('/', protect, staff, async (req, res) => {
    try {
        const query = {};
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';
        const isAdminOrHospitalAdmin = ['admin', 'hospitaladmin'].includes(normalizedRole);

        if (isAdminOrHospitalAdmin || normalizedRole === 'depthead') {
            query.hospital = req.user.hospital?._id || req.user.hospital;
        } else if (isSuperAdmin && req.query.hospitalId) {
            query.hospital = req.query.hospitalId;
        }

        // Apply additional filters from query parameters
        const { feedbackId, department, type, comment, status, dateFrom, dateTo } = req.query;

        if (feedbackId) {
            query.feedbackId = { $regex: new RegExp(feedbackId, 'i') };
        }
        if (department) {
            query['categories.department'] = { $regex: new RegExp(department, 'i') };
        }
        if (type) {
            query['categories.reviewType'] = type;
        }
        if (comment) {
            query.comments = { $regex: new RegExp(comment, 'i') };
        }
        if (status) {
            query.status = status;
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                query.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDay = new Date(dateTo);
                endDay.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDay;
            }
        }

        const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Feedback fetch error:', error);
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Get feedback stats (Admin)
// @route   GET /api/feedback/stats
router.get('/stats', protect, staff, async (req, res) => {
    try {
        const filter = {};
        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(userRole);
        const isSuperAdmin = userRole === 'superadmin';

        if (isAdmin || userRole === 'depthead') {
            filter.hospital = req.user.hospital?._id || req.user.hospital;
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

        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(userRole);

        // Only allow head of their own dept unless admin (case-insensitive check)
        const myDept = req.user.department?.trim().toLowerCase();
        if (!isAdmin && myDept !== deptName?.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized for this department view' });
        }

        // Scope query to the user's hospital to prevent cross-hospital data leaks
        const filter = {
            assignedTo: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        };
        const hId = req.user.hospital?._id || req.user.hospital;
        if (hId) {
            filter.hospital = hId;
        }

        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Get feedback for TV Display (Public)
// @route   GET /api/feedback/tv/:hospitalId
router.get('/tv/:hospitalId', async (req, res) => {
    try {
        let hId = req.params.hospitalId;
        console.log(`[TV Dashboard] Request for hospitalId: ${hId}`);
        let hospital;

        if (hId && !mongoose.Types.ObjectId.isValid(hId)) {
            hospital = await Hospital.findOne({ uniqueId: hId });
            if (!hospital) {
                console.warn(`[TV Dashboard] Hospital not found by slug: ${hId}`);
                return res.status(404).json({ message: 'Hospital not found by slug' });
            }
            hId = hospital._id;
        } else {
            hospital = await Hospital.findById(hId);
        }
        
        if (!hospital) {
            console.warn(`[TV Dashboard] Hospital not found for ID: ${hId}`);
            return res.status(404).json({ message: 'Hospital not found' });
        }

        console.log(`[TV Dashboard] Hospital resolved: ${hospital.name} (${hId})`);

        const { tvFilters } = hospital;
        const { deptId } = req.query; // New optional filter
        const query = { hospital: hId };

        // Fetch existing departments for this hospital
        const existingDepts = await Department.find({ hospital: hId });
        const existingDeptNames = existingDepts.map(d => d.name);

        // Department-specific filtering (Highest Priority)
        if (deptId) {
            const targetDept = existingDepts.find(d => d._id.toString() === deptId);
            if (targetDept) {
                query['categories.department'] = targetDept.name;
            }
        } else if (tvFilters) {
            const filterDepts = tvFilters.departments || [];
            const validDepts = filterDepts.filter(d => existingDeptNames.includes(d));
            
            if (validDepts.length > 0) {
                query['categories.department'] = { $in: validDepts };
            }
        }

        if (tvFilters) {
            if (tvFilters.type && tvFilters.type !== 'All Types') {
                query['categories.reviewType'] = tvFilters.type;
            }
            
            // Handle status filtering: If status filter is defined and not empty, use it.
            // Otherwise, default to IN PROGRESS + Pending (usually for active monitoring).
            if (tvFilters.status) {
                query.status = tvFilters.status;
            } else {
                // If "All Statuses" or no filter, we show both Pending and In Progress usually
                // but let's make it show everything except maybe COMPLETED if that's the goal.
                // For now, let's just make it NOT filter by status if set to empty.
            }
        } else {
            // Default behavior when no filters configured
            query.status = 'IN PROGRESS';
        }

        console.log(`[TV Dashboard] Query:`, JSON.stringify(query, null, 2));
        const feedbacks = await Feedback.find(query)
            .sort({ createdAt: -1 })
            .populate('hospital')
            .lean();
        console.log(`[TV Dashboard] Found ${feedbacks.length} feedbacks`);
        res.json(feedbacks);
    } catch (error) {
        console.error('[TV Dashboard] Filter error:', error);
        res.status(500).json({ message: 'Error fetching TV feedback' });
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

        // Correct hospital check: compare IDs
        const userHospId = req.user.hospital?._id?.toString() || req.user.hospital?.toString();
        const feedbackHospId = feedback.hospital?.toString();

        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = userRole === 'superadmin';

        // Hospital Access Check: Ensure staff only access their own hospital's data
        if (!isSuperAdmin && feedbackHospId !== userHospId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        const isAdmin = ['admin', 'hospitaladmin'].includes(userRole);
        const myDept = req.user.department?.trim().toLowerCase();
        const assignedDept = feedback.assignedTo?.trim().toLowerCase();
        const isAssignedDeptHead = userRole === 'depthead' && assignedDept === myDept;

        if (!isAdmin && !isSuperAdmin && !isAssignedDeptHead) {
            return res.status(403).json({ message: 'Not authorized to update this feedback' });
        }

        // --- Role-Based Permission Logic ---

        // 1. Updating 'assignedTo' and 'categories' is ONLY for Admins
        if (req.body.assignedTo !== undefined || req.body.categoryUpdate !== undefined) {
            if (!isAdmin && !isSuperAdmin) {
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
            const oldStatus = feedback.status;
            const newStatus = req.body.status;
            
            console.log(`[Status Change] Feedback: ${feedback.feedbackId}, Old: ${oldStatus}, New: ${newStatus}`);

            feedback.status = newStatus;

            // Only trigger resolution email if status CHANGED to COMPLETED successfully
            // This prevents duplicate emails if the record is saved again while already at COMPLETED
            if (newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED' && feedback.patientEmail) {
                console.log(`[Resolution Email] Triggered for: ${feedback.patientEmail}`);
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

        const userHospId = req.user.hospital?._id?.toString() || req.user.hospital?.toString();
        const feedbackHospId = feedback.hospital?.toString();

        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = userRole === 'superadmin';

        if (!isSuperAdmin && feedbackHospId !== userHospId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        const isAdmin = ['admin', 'hospitaladmin'].includes(userRole);
        const myDept = req.user.department?.trim().toLowerCase();
        const assignedDept = feedback.assignedTo?.trim().toLowerCase();
        const isAssignedDeptHead = userRole === 'depthead' && assignedDept === myDept;

        if (!isAdmin && !isSuperAdmin && !isAssignedDeptHead) {
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

        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = userRole === 'superadmin';

        const userHospId = req.user.hospital?._id?.toString() || req.user.hospital?.toString();
        const feedbackHospId = feedback.hospital?.toString();

        if (!isSuperAdmin && feedbackHospId !== userHospId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        const isAdmin = ['admin', 'hospitaladmin'].includes(userRole);

        if (!isAdmin && !isSuperAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete feedback' });
        }

        await feedback.deleteOne();
        res.json({ message: 'Feedback removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing feedback' });
    }
});

export default router;
