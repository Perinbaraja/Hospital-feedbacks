import express from 'express';
import mongoose from 'mongoose';
import _Feedback from '../models/Feedback.js';
import _Hospital from '../models/Hospital.js';
import _Department from '../models/Department.js';
import { sendThankYouEmail, sendResolutionEmail } from '../services/emailService.js';
import { protect, admin } from './userRoutes.js';
import { validateFeedbackInput } from '../middleware/validation.js';
import { generateFeedbackId } from '../utils/idGenerator.js';

const Feedback = _Feedback?.default || _Feedback;
const Hospital = _Hospital?.default || _Hospital;
const Department = _Department?.default || _Department;

const router = express.Router();


// @desc    Dashboard Metrics
// @route   GET /api/feedback/admin-dashboard
router.get('/admin-dashboard', protect, admin, async (req, res) => {
    try {
        const query = {};
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedAuthRole !== 'superadmin') {
            query.hospitalId = req.user.hospitalId;
        }

        console.log(`[Dashboard Debug] User: ${req.user.email}, Role: ${normalizedAuthRole}, HospitalId: ${query.hospitalId}`);

        const totalEncounters = await Feedback.countDocuments(query);
        const positiveCount = await Feedback.countDocuments({ 
            ...query,
            "categories.reviewType": { $in: ["Positive", "positive", "completely_satisfied", "completely satisfied", "Mixed"] } 
        });
        const negativeCount = await Feedback.countDocuments({ 
            ...query,
            "categories.reviewType": { $in: ["Negative", "negative", "needs_work", "Needs Work", "not_satisfied", "not satisfied", "Mixed"] } 
        });
        const resolvedIssues = await Feedback.countDocuments({ ...query, status: "COMPLETED" });

        console.log(`[Dashboard Results] Total: ${totalEncounters}, Pos: ${positiveCount}, Neg: ${negativeCount}, Resolved: ${resolvedIssues}`);

        res.json({
            totalEncounters,
            positiveCount,
            negativeCount,
            resolvedIssues,
            debugHospitalId: query.hospitalId,
            debugRole: normalizedAuthRole
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// @desc    Submit new feedback
// @route   POST /api/feedback
router.post('/', validateFeedbackInput, async (req, res) => {
    try {
        const { patientName, patientEmail, categories, hospital } = req.body;

        // Verify hospital is active before accepting feedback
        const targetHospital = await Hospital.findById(hospital);
        if (!targetHospital || targetHospital.isActive === false) {
            console.warn(`[Feedback Submission] Denied: Hospital ${hospital} is inactive or not found.`);
            return res.status(403).json({ message: 'Feedback submission is currently disabled for this facility.' });
        }

        const createdFeedbacks = [];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const issueList = Array.isArray(cat.issue) 
                ? cat.issue 
                : (typeof cat.issue === 'string' ? cat.issue.split(';').map(s => s.trim()).filter(s => s) : []);
            const fId = await generateFeedbackId();

            // Backend re-validation of reviewType based on issues
            const dept = await Department.findOne({ hospital, name: cat.department });
            const positiveIssues = dept?.positiveIssues || [];
            const negativeIssues = dept?.negativeIssues || [];

            const hasPositive = issueList.some(iss => positiveIssues.includes(iss));
            const hasNegative = issueList.some(iss => negativeIssues.includes(iss));

            let finalReviewType = cat.reviewType;
            if (hasPositive && hasNegative) {
                finalReviewType = 'Mixed';
            } else if (hasPositive) {
                finalReviewType = 'Positive';
            } else if (hasNegative) {
                finalReviewType = 'Negative';
            } else if (!finalReviewType) {
                finalReviewType = 'Negative'; 
            }

            const isPosEntry = ["Positive", "positive", "completely_satisfied", "completely satisfied"].includes(finalReviewType);
            const isNegEntry = ["Negative", "negative", "needs_work", "Needs Work", "not_satisfied", "not satisfied"].includes(finalReviewType);

            const feedback = await Feedback.create({
                feedbackId: fId,
                patientName,
                patientEmail,
                hospital,
                hospitalId: hospital.toString(),
                positive: isPosEntry ? new Date() : null,
                negative: isNegEntry ? new Date() : null,
                comments: req.body.comments || (cat && cat.note) || "",
                categories: [{
                    department: cat.department,
                    issue: issueList,
                    positive_issues: cat.positive_issues || [],
                    negative_issues: cat.negative_issues || [],
                    positive_feedback: cat.positive_feedback || cat.positive_issues || [],
                    negative_feedback: cat.negative_feedback || cat.negative_issues || [],
                    note: cat.note,
                    reviewType: finalReviewType,
                    feedback: cat.feedback,
                    image: cat.image
                }],
                status: 'IN PROGRESS',
                assignedTo: cat.department
            });
            createdFeedbacks.push(feedback);
        }

        if (patientEmail) {
            try {
                await sendThankYouEmail(patientEmail, patientName, req);
            } catch (emailError) {
                console.error('Email send failed but feedback was saved:', emailError);
            }
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
        const query = {};
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (!isSuperAdmin) {
            query.hospitalId = req.user.hospitalId;
        } else if (req.query.hospitalId) {
            query.hospitalId = req.query.hospitalId;
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

        // Ensure we retrieve records that have either markers OR comments
        query.$or = [
            { positive: { $ne: null } },
            { negative: { $ne: null } },
            { comments: { $ne: "" } }
        ];

        const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Feedback fetch error:', error);
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// @desc    Get feedback stats (Admin)
// @route   GET /api/feedback/stats
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const filter = {};
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (!isSuperAdmin) {
            filter.hospitalId = req.user.hospitalId;
        } else if (isSuperAdmin && req.query.hospitalId) {
            filter.hospitalId = req.query.hospitalId;
        }

        const query = { ...filter };
        
        const stats = await Feedback.aggregate([
            { $match: query },
            {
                $facet: {
                    counts: [
                        { $group: {
                            _id: null,
                            total: { $sum: 1 },
                            pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
                            inProgress: { $sum: { $cond: [{ $eq: ["$status", "IN PROGRESS"] }, 1, 0] } },
                            completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } }
                        }}
                    ],
                    distribution: [
                        { $unwind: "$categories" },
                        { $group: {
                            _id: "$categories.department",
                            count: { $sum: 1 },
                            positiveCount: { $sum: { $cond: [{ $eq: ["$categories.reviewType", "Positive"] }, 1, 0] } },
                            negativeCount: { $sum: { $cond: [{ $in: ["$categories.reviewType", ["Negative", "negative", "Needs Work", "needs_work"]] }, 1, 0] } }
                        }}
                    ]
                }
            }
        ]);

        const baseStats = stats[0]?.counts[0] || { total: 0, pending: 0, inProgress: 0, completed: 0 };
        const deptDistribution = {};
        let totalPositive = 0;
        let totalNegative = 0;

        if (stats[0]?.distribution) {
            stats[0].distribution.forEach(d => {
                if (d._id) {
                    deptDistribution[d._id] = d.count;
                }
                totalPositive += d.positiveCount;
                totalNegative += d.negativeCount;
            });
        }

        res.json({
            total: baseStats.total,
            pending: baseStats.pending,
            inProgress: baseStats.inProgress,
            completed: baseStats.completed,
            positiveCount: totalPositive,
            negativeCount: totalNegative,
            deptDistribution
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// @desc    Get feedback for specific department (Dept Head)
// @route   GET /api/feedback/department/:dept
router.get('/department/:dept', protect, async (req, res) => {
    try {
        const deptName = req.params.dept?.trim();

        const userRole = req.user.role?.toLowerCase();
        const isAdmin = ['admin', 'hospital_admin'].includes(userRole);

        // Only allow head of their own dept unless admin (case-insensitive check)
        const myDept = req.user.department?.trim().toLowerCase();
        if (!isAdmin && myDept !== deptName?.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized for this department view' });
        }

        // Scope query to the user's hospital to prevent cross-hospital data leaks
        const filter = {
            assignedTo: { $regex: new RegExp(deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        };
        
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedAuthRole !== 'superadmin') {
            filter.hospitalId = req.user.hospitalId;
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
                // Compatibility for old "Negative" type if requested
                const typeToQuery = tvFilters.type === 'Negative' ? 'negative' : tvFilters.type;
                query['categories.reviewType'] = typeToQuery;
            }
            
            query.status = tvFilters.status || 'IN PROGRESS';
        } else {
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

        // Hospital Access Check: Ensure staff only access their own hospital's data
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedAuthRole !== 'superadmin' && feedback.hospitalId !== req.user.hospitalId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        const userRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin', 'superadmin'].includes(userRole);
        const myDept = req.user.department?.trim().toLowerCase();
        const assignedDept = feedback.assignedTo?.trim().toLowerCase();
        const isAssignedDeptHead = userRole === 'depthead' && assignedDept === myDept;

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
                sendResolutionEmail(feedback.patientEmail, feedback.patientName, req);
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

        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedAuthRole !== 'superadmin' && feedback.hospitalId !== req.user.hospitalId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        const userRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin', 'superadmin'].includes(userRole);
        const myDept = req.user.department?.trim().toLowerCase();
        const assignedDept = feedback.assignedTo?.trim().toLowerCase();
        const isAssignedDeptHead = userRole === 'depthead' && assignedDept === myDept;

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

        const userRole = req.user.role?.toLowerCase();
        const isAdmin = ['admin', 'hospital_admin', 'super_admin'].includes(userRole);

        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedAuthRole !== 'superadmin' && feedback.hospitalId !== req.user.hospitalId) {
            return res.status(403).json({ message: 'Not authorized for this hospital\'s feedback' });
        }

        if (!isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete feedback' });
        }

        await feedback.deleteOne();
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: "Delete failed", error });
    }
});

export default router;
