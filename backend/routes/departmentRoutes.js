import express from 'express';
import mongoose from 'mongoose';
import _Department from '../models/Department.js';
import _Hospital from '../models/Hospital.js';
import { protect, admin } from './userRoutes.js';
import { sendDepartmentAssignmentEmail } from '../services/emailService.js';
import { cacheHospitalConfig, invalidateHospitalConfigCache } from '../utils/hospitalConfigCache.js';
import { validateFeedbackConfigs } from '../middleware/validation.js';

const Department = _Department?.default || _Department;
const Hospital = _Hospital?.default || _Hospital;
const router = express.Router();

const normalizeFeedbackConfigs = (feedbackConfigs = []) => {
    if (!Array.isArray(feedbackConfigs)) return [];

    return feedbackConfigs.map((config) => ({
        type: (config?.type || '').toLowerCase() === 'negative' ? 'negative' : 'positive',
        label: config?.label?.trim?.() || '',
        emailEnabled: Boolean(config?.emailEnabled),
        recipientName: config?.emailEnabled ? (config?.recipientName?.trim?.() || '') : '',
        recipientEmail: config?.emailEnabled ? (config?.recipientEmail?.trim?.().toLowerCase?.() || '') : ''
    })).filter((config) => config.label);
};

const syncDepartmentFields = (dept) => {
    const feedbackConfigs = Array.isArray(dept.feedbackConfigs) ? dept.feedbackConfigs : [];
    const positiveLabels = feedbackConfigs.filter((config) => config.type === 'positive').map((config) => config.label);
    const negativeLabels = feedbackConfigs.filter((config) => config.type === 'negative').map((config) => config.label);

    dept.feedbackConfigs = feedbackConfigs;
    dept.positiveIssues = positiveLabels;
    dept.negativeIssues = negativeLabels;
    dept.positive_feedback = positiveLabels.join('; ');
    dept.negative_feedback = negativeLabels.join('; ');
};

// @desc    Get all departments for a hospital
// @route   GET /api/departments
router.get('/', async (req, res) => {
    const { hospitalId } = req.query;
    try {
        let hId = hospitalId;
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';

        if (!hId && req.user?.hospitalId && !isSuperAdmin) {
            hId = req.user.hospitalId.toString();
        }

        if (hId && !mongoose.Types.ObjectId.isValid(hId)) {
            // It's a slug, find the ID!
            const hospital = await Hospital.findOne({ uniqueId: hId });
            hId = hospital ? hospital._id.toString() : null;
        } else if (hId) {
            hId = hId.toString();
        }

        if (!hId) {
            return res.status(400).json({ message: 'Hospital ID is required' });
        }

        const query = { hospitalId: hId };
        
        // If logged in, further restrict by hospitalId unless superadmin
        if (req.user && !isSuperAdmin) {
            query.hospitalId = req.user.hospitalId;
        }

        const departments = await Department.find(query);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Error fetching departments' });
    }
});

// @desc    Get single department by id
// @route   GET /api/departments/:id
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Department ID format' });
        }

        const dept = await Department.findById(req.params.id).lean();
        if (!dept) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json(dept);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ message: 'Error fetching department' });
    }
});

// @desc    Add a department
// @route   POST /api/departments
router.post('/', protect, admin, async (req, res) => {
    const { name, imageUrl, description, incharges } = req.body;
    const { hospitalId } = req.query;

    try {
        const hId = (hospitalId && (req.user.role === 'Super_Admin' || req.user.role === 'super_admin')) ? hospitalId : req.user.hospitalId;
        if (!hId) return res.status(400).json({ message: 'Hospital ID not authorized or missing' });

        const feedbackConfigs = normalizeFeedbackConfigs(req.body.feedbackConfigs);
        const feedbackConfigError = validateFeedbackConfigs(feedbackConfigs);
        if (feedbackConfigError) {
            return res.status(400).json({ message: feedbackConfigError });
        }

        // Case-insensitive duplicate check
        const exists = await Department.findOne({ 
            hospitalId: hId, 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
        });
        if (exists) return res.status(400).json({ message: 'Department already exists' });

        const dept = new Department({
            name,
            hospital: hId,
            hospitalId: hId,
            imageUrl,
            description,
            incharges: incharges || [],
            feedbackConfigs
        });
        syncDepartmentFields(dept);
        await dept.save();

        // Fire and forget emails to incharges
        if (incharges && incharges.length > 0) {
            incharges.forEach(inc => {
                if (inc.email) {
                    sendDepartmentAssignmentEmail(inc.email, inc.name, dept).catch(e => console.error(`[DEPT-CREATE] Email failed for ${inc.email}:`, e.message));
                }
            });
        }

        // Also update nested array in Hospital for backward compatibility
        const hospital = await Hospital.findById(hId);
        if (hospital) {
            hospital.departments.push({
                name,
                imageUrl,
                description,
                positive_feedback: dept.positive_feedback,
                negative_feedback: dept.negative_feedback,
                positiveIssues: dept.positiveIssues,
                negativeIssues: dept.negativeIssues,
                incharges: incharges || [],
                feedbackConfigs: dept.feedbackConfigs
            });
            await hospital.save();
            invalidateHospitalConfigCache(hospital);
            cacheHospitalConfig(hospital);
        }

        res.status(201).json(dept);
    } catch (error) {
        console.error('Error adding department:', error);
        res.status(500).json({ message: 'Error adding department' });
    }
});

// @desc    Update a department
// @route   PUT /api/departments/:id
router.put('/:id', protect, admin, async (req, res) => {
    const { name, imageUrl, description } = req.body;
    try {
        const idStr = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(idStr)) {
            return res.status(400).json({ message: 'Invalid Department ID format' });
        }

        const dept = await Department.findById(idStr);
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        const recordHIdStr = (dept.hospital?._id || dept.hospital || dept.hospitalId || '').toString();
        const currentAdminHId = req.user.hospitalId?.toString();
        const oldName = dept.name;

        const normalizedRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedRole !== 'superadmin' && recordHIdStr !== currentAdminHId) {
            return res.status(403).json({ message: 'Not authorized to manage this hospital department' });
        }

        // Check for duplicate name if name is changed
        if (name && name.trim().toLowerCase() !== oldName.toLowerCase()) {
            if (recordHIdStr && mongoose.Types.ObjectId.isValid(recordHIdStr)) {
                const exists = await Department.findOne({ 
                    hospitalId: recordHIdStr, 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
                    _id: { $ne: idStr } 
                });
                if (exists) return res.status(400).json({ message: 'Department already exists with this name' });
            }
        }

        const feedbackConfigs = normalizeFeedbackConfigs(req.body.feedbackConfigs);
        const feedbackConfigError = validateFeedbackConfigs(feedbackConfigs);
        if (feedbackConfigError) {
            return res.status(400).json({ message: feedbackConfigError });
        }

        dept.name = name || dept.name;
        dept.imageUrl = imageUrl !== undefined ? imageUrl : dept.imageUrl;
        dept.description = description !== undefined ? description : dept.description;
        if (req.body.feedbackConfigs !== undefined) {
            dept.feedbackConfigs = feedbackConfigs;
            syncDepartmentFields(dept);
        }

        const oldIncharges = (dept.incharges || []).map(i => i.email);
        const newIncharges = req.body.incharges || [];
        dept.incharges = newIncharges;

        const updatedDept = await dept.save();

        // Notify NEW incharges that weren't there before
        newIncharges.forEach(inc => {
            if (inc.email && !oldIncharges.includes(inc.email)) {
                sendDepartmentAssignmentEmail(inc.email, inc.name, updatedDept).catch(e => console.error(`[DEPT-UPDATE] Email failed for ${inc.email}:`, e.message));
            }
        });

        // Sync to nested array in Hospital
        const hId = recordHIdStr;
        
        if (hId && mongoose.Types.ObjectId.isValid(hId)) {
            const hospital = await Hospital.findById(hId);
            if (hospital) {
                const nestedIdx = hospital.departments.findIndex(d => 
                    (d.name || '').trim().toLowerCase() === oldName.trim().toLowerCase()
                );
                if (nestedIdx !== -1) {
                    hospital.departments[nestedIdx].set({
                        name: dept.name,
                        imageUrl: dept.imageUrl,
                        description: dept.description,
                        positive_feedback: dept.positive_feedback,
                        negative_feedback: dept.negative_feedback,
                        positiveIssues: dept.positiveIssues,
                        negativeIssues: dept.negativeIssues,
                        incharges: dept.incharges || [],
                        feedbackConfigs: dept.feedbackConfigs || []
                    });
                } else {
                    hospital.departments.push({
                        name: dept.name,
                        imageUrl: dept.imageUrl,
                        description: dept.description,
                        positive_feedback: dept.positive_feedback,
                        negative_feedback: dept.negative_feedback,
                        positiveIssues: dept.positiveIssues,
                        negativeIssues: dept.negativeIssues,
                        incharges: dept.incharges || [],
                        feedbackConfigs: dept.feedbackConfigs || []
                    });
                }
                await hospital.save();
                invalidateHospitalConfigCache(hospital);
                cacheHospitalConfig(hospital);
            }
        }

        res.json(updatedDept);
    } catch (error) {
        console.error('[DEPT-UPDATE-ERROR]', error);
        res.status(500).json({ message: `Error updating department: ${error.message}` });
    }
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const normalizedRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin';
        
        // Find by ID first to check ownership/permissions
        const dept = await Department.findById(req.params.id);
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        // Security check: Only Super Admin OR the admin of the target hospital
        const recordHId = dept.hospitalId?.toString();
        const userHId = req.user.hospitalId?.toString();

        if (!isSuperAdmin && recordHId !== userHId) {
            return res.status(403).json({ message: 'Not authorized to delete this department' });
        }

        const hId = dept.hospital || dept.hospitalId;
        const deptName = dept.name;

        // Perform deletion from collection
        const deletedDoc = await Department.findByIdAndDelete(req.params.id);
        if (!deletedDoc) {
            console.warn(`[DEPT-DELETE] Document not found in collection during deletion: ${req.params.id}`);
        }

        // Now sync to nested array in Hospital for backward compatibility
        const hospital = await Hospital.findById(hId);
        if (hospital) {
            const originalCount = hospital.departments.length;
            // Case-insensitive name filter to be safe
            hospital.departments = hospital.departments.filter(d => 
                (d.name || '').trim().toLowerCase() !== deptName.trim().toLowerCase()
            );
            
            await hospital.save();
            invalidateHospitalConfigCache(hospital);
            cacheHospitalConfig(hospital);
        }

        res.json({ message: 'Department removed successfully', id: req.params.id });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: `Error deleting department: ${error.message}` });
    }
});

export default router;
