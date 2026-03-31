import express from 'express';
import mongoose from 'mongoose';
import _Department from '../models/Department.js';
import _Hospital from '../models/Hospital.js';
import { protect, admin } from './userRoutes.js';
import { sendDepartmentAssignmentEmail } from '../services/emailService.js';
import { cacheHospitalConfig, invalidateHospitalConfigCache } from '../utils/hospitalConfigCache.js';

const Department = _Department?.default || _Department;
const Hospital = _Hospital?.default || _Hospital;
const router = express.Router();

// @desc    Get all departments for a hospital
// @route   GET /api/departments
router.get('/', async (req, res) => {
    const { hospitalId } = req.query;
    try {
        let hId = hospitalId;
        console.log(`[DEPT-FETCH] Incoming hospitalId: ${hospitalId}`);

        if (hId && !mongoose.Types.ObjectId.isValid(hId)) {
            // It's a slug, find the ID!
            const hospital = await Hospital.findOne({ uniqueId: hId });
            hId = hospital ? hospital._id.toString() : null;
        } else if (hId) {
            hId = hId.toString();
        }

        if (!hId) {
            // If still no hId, fallback to first hospital's ID
            const hospital = await Hospital.findOne({});
            hId = hospital ? hospital._id : null;
            console.log(`[DEPT-FETCH] No ID provided. Falling back to first hospital: ${hId}`);
        } else {
            console.log(`[DEPT-FETCH] Final Resolved Hospital ID: ${hId}`);
        }

        const query = { hospitalId: hId };
        
        // If logged in, further restrict by hospitalId unless superadmin
        if (req.user && req.user.role !== 'Super_Admin' && req.user.role !== 'super_admin') {
            query.hospitalId = req.user.hospitalId;
        }

        const departments = await Department.find(query);
        console.log(`[DEPT-FETCH] Found ${departments.length} departments for this hospital`);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Error fetching departments' });
    }
});

// @desc    Add a department
// @route   POST /api/departments
router.post('/', protect, admin, async (req, res) => {
    const { name, imageUrl, description, positiveIssues, negativeIssues, positive_feedback, negative_feedback, incharges } = req.body;
    const { hospitalId } = req.query;

    try {
        const hId = (hospitalId && (req.user.role === 'Super_Admin' || req.user.role === 'super_admin')) ? hospitalId : req.user.hospitalId;
        if (!hId) return res.status(400).json({ message: 'Hospital ID not authorized or missing' });

        // Case-insensitive duplicate check
        const exists = await Department.findOne({ 
            hospitalId: hId, 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
        });
        if (exists) return res.status(400).json({ message: 'Department already exists' });

        const dept = await Department.create({
            name,
            hospital: hId,
            hospitalId: hId,
            imageUrl,
            description,
            positive_feedback: req.body.positive_feedback || '',
            negative_feedback: req.body.negative_feedback || '',
            positiveIssues,
            negativeIssues,
            incharges: incharges || []
        });

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
                positive_feedback: req.body.positive_feedback || '',
                negative_feedback: req.body.negative_feedback || '',
                positiveIssues,
                negativeIssues,
                incharges: incharges || []
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
    const { name, imageUrl, description, positiveIssues, negativeIssues, positive_feedback, negative_feedback } = req.body;
    try {
        const idStr = req.params.id;
        console.log(`[DEPT-UPDATE-START] ID: ${idStr}`);

        if (!mongoose.Types.ObjectId.isValid(idStr)) {
            return res.status(400).json({ message: 'Invalid Department ID format' });
        }

        const dept = await Department.findById(idStr);
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        const recordHIdStr = (dept.hospital?._id || dept.hospital || dept.hospitalId || '').toString();
        const currentAdminHId = req.user.hospitalId?.toString();
        const oldName = dept.name;

        console.log(`[DEPT-UPDATE-PERM] Dept Hosp: ${recordHIdStr}, Admin Hosp: ${currentAdminHId}`);

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

        dept.name = name || dept.name;
        dept.imageUrl = imageUrl !== undefined ? imageUrl : dept.imageUrl;
        dept.description = description !== undefined ? description : dept.description;
        if (positiveIssues !== undefined) dept.positiveIssues = positiveIssues;
        if (negativeIssues !== undefined) dept.negativeIssues = negativeIssues;
        dept.positive_feedback = req.body.positive_feedback !== undefined ? req.body.positive_feedback : dept.positive_feedback;
        dept.negative_feedback = req.body.negative_feedback !== undefined ? req.body.negative_feedback : dept.negative_feedback;

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
        console.log(`[DEPT-UPDATE-SYNC] Syncing nested hospital array for ID: ${hId}`);
        
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
                        incharges: dept.incharges || []
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
                        incharges: dept.incharges || []
                    });
                }
                await hospital.save();
                invalidateHospitalConfigCache(hospital);
                cacheHospitalConfig(hospital);
                console.log(`[DEPT-UPDATE-SYNC] Nested hospital array synchronized.`);
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
        
        console.log(`[DEPT-DELETE] Dept Hospital: ${recordHId}, User Hospital: ${userHId}, SuperAdmin: ${isSuperAdmin}`);

        if (!isSuperAdmin && recordHId !== userHId) {
            return res.status(403).json({ message: 'Not authorized to delete this department' });
        }

        const hId = dept.hospital || dept.hospitalId;
        const deptName = dept.name;

        console.log(`[DEPT-DELETE] Deleting: ${deptName} (${req.params.id}) for hospital: ${hId}`);

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
            
            console.log(`[DEPT-DELETE] Hospital Sync: Removed ${originalCount - hospital.departments.length} items from nested array`);
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
