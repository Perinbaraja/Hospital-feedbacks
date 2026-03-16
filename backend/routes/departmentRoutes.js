import express from 'express';
import Department from '../models/Department.js';
import Hospital from '../models/Hospital.js';
import { protect, admin } from './userRoutes.js';

const router = express.Router();

// @desc    Get all departments for a hospital
// @route   GET /api/departments
router.get('/', async (req, res) => {
    const { hospitalId } = req.query;
    try {
        let query = {};
        if (hospitalId) {
            query.hospital = hospitalId;
        } else {
            // If no hospitalId, find the first hospital as fallback
            const hospital = await Hospital.findOne({});
            if (hospital) query.hospital = hospital._id;
        }

        const departments = await Department.find(query);
        // User requested a list of names in the example, but for the UI we need objects.
        // I will return objects to maintain compatibility with existing frontend logic.
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Error fetching departments' });
    }
});

// @desc    Add a department
// @route   POST /api/departments
router.post('/', protect, admin, async (req, res) => {
    const { name, imageUrl, description, positiveIssues, negativeIssues } = req.body;
    const { hospitalId } = req.query;

    try {
        const hId = hospitalId || req.user.hospital;
        if (!hId) return res.status(400).json({ message: 'Hospital ID required' });

        const exists = await Department.findOne({ name, hospital: hId });
        if (exists) return res.status(400).json({ message: 'Department already exists' });

        const dept = await Department.create({
            name,
            hospital: hId,
            imageUrl,
            description,
            positiveIssues,
            negativeIssues
        });

        // Also update nested array in Hospital for backward compatibility
        const hospital = await Hospital.findById(hId);
        if (hospital) {
            hospital.departments.push({
                name,
                imageUrl,
                description,
                positiveIssues,
                negativeIssues
            });
            await hospital.save();
        }

        res.status(201).json(dept);
    } catch (error) {
        console.error('Error adding department:', error);
        res.status(500).json({ message: 'Error adding department' });
    }
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const dept = await Department.findById(req.params.id);
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        const hId = dept.hospital;
        const deptName = dept.name;

        await Department.findByIdAndDelete(req.params.id);

        // Also update nested array in Hospital for backward compatibility
        const hospital = await Hospital.findById(hId);
        if (hospital) {
            hospital.departments = hospital.departments.filter(d => d.name !== deptName);
            await hospital.save();
        }

        res.json({ message: 'Department removed' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Error deleting department' });
    }
});

export default router;
