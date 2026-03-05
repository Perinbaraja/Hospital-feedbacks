import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Feedback from '../models/Feedback.js';

// Protect routes middleware
export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin middleware
export const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Super_Admin')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

// Super Admin middleware
export const superAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Super_Admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a Super Admin' });
    }
};

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/users/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).populate('hospital');

        if (user && (await user.matchPassword(password))) {
            if (!user.isActive) {
                return res.status(403).json({ message: 'Your account is deactivated. Contact Super Admin.' });
            }

            if (user.role !== 'Super_Admin' && user.hospital && !user.hospital.isActive) {
                return res.status(403).json({ message: 'Super Admin restricted your access' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                hospital: user.hospital,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Register a new user (Admin only)
// @route   POST /api/users
router.post('/', protect, admin, async (req, res) => {
    const { name, email, password, role, department } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const { hospitalId } = req.body;
        const targetHospital = (hospitalId && req.user.role === 'Super_Admin') ? hospitalId : req.user.hospital;

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'Dept_Head',
            department,
            hospital: targetHospital
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get all users
// @route   GET /api/users
router.get('/', protect, async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'Admin') {
            filter.hospital = req.user.hospital;
        } else if (req.user.role === 'Super_Admin' && req.query.hospitalId) {
            filter.hospital = req.query.hospitalId;
        }

        const users = await User.find(filter).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Update user profile (Self update)
// @route   PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            if (req.body.password) {
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
});


// @desc    Delete a user
// @route   DELETE /api/users/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Toggle user active status (Super Admin only)
// @route   PUT /api/users/:id/status
router.put('/:id/status', protect, superAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : !user.isActive;
            const updatedUser = await user.save();
            res.json({ _id: updatedUser._id, name: updatedUser.name, isActive: updatedUser.isActive });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Reset password
// @route   POST /api/users/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
