import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Feedback from '../models/Feedback.js';
import { validateUserInput } from '../middleware/validation.js';

// Protect routes middleware
export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

// Optional Protect middleware (extracts user if token exists, but doesn't fail if it doesn't)
export const optionalProtect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = await User.findById(decoded.id).select('-password');
            }
        } catch (error) {
            console.error('Optional token verification failed:', error.message);
        }
    }
    return next();
};

// Admin middleware
export const admin = (req, res, next) => {
    const isHospitalAdmin = req.user && (req.user.role === 'Admin' || req.user.role === 'hospital_admin');
    const isSuperAdmin = req.user && (req.user.role === 'Super_Admin' || req.user.role === 'super_admin');

    if (isHospitalAdmin || isSuperAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

// Super Admin middleware
export const superAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'Super_Admin' || req.user.role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as a Super Admin' });
    }
};

const router = express.Router();

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not configured');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/users/login
router.post('/login', validateUserInput, async (req, res) => {
    const email = req.body.email?.trim();
    const { password } = req.body;

    try {
        console.log(`[LOGIN] Attempt for email: ${email}`);
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).populate('hospital');

        if (user && (await user.matchPassword(password))) {
            if (!user.isActive) {
                console.warn(`[LOGIN] Denied: Account ${email} is deactivated.`);
                return res.status(403).json({ message: 'Your account is deactivated. Contact Super Admin.' });
            }

            if (user.role !== 'Super_Admin' && user.hospital && !user.hospital.isActive) {
                console.warn(`[LOGIN] Denied: Hospital for ${email} is restricted.`);
                return res.status(403).json({ message: 'Super Admin restricted your access' });
            }

            console.log(`[LOGIN] Success: ${user.name} (${user.role})`);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || '',
                hospital: user.role === 'Super_Admin' ? null : user.hospital,
                token: generateToken(user._id),
            });
        } else {
            console.warn(`[LOGIN] Failed: Invalid credentials for ${email}`);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('[LOGIN] Server Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Register a new user (Admin only)
// @route   POST /api/users
router.post('/', protect, admin, validateUserInput, async (req, res) => {
    const { name, email, password, role, department } = req.body;

    try {
        const userExists = await User.findOne({
            email: { $regex: new RegExp(`^${email?.trim()}$`, 'i') }
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const { hospitalId } = req.body;
        const targetHospital = (hospitalId && req.user.role === 'Super_Admin') ? hospitalId : req.user.hospital;

        const user = await User.create({
            name: name?.trim(),
            email: email?.trim().toLowerCase(),
            password: password || 'password123',
            role: role || 'Dept_Head',
            department: department?.trim(),
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
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        if (isAdmin) {
            filter.hospital = req.user.hospital;
        } else if (isSuperAdmin && req.query.hospitalId) {
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
            user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
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
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        res.status(500).json({ message: 'Server error updating profile' });
    }
});


// @desc    Delete a user
// @route   DELETE /api/users/:id
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        if (isAdmin) {
            if (isSuperAdmin || (user.hospital?.toString() !== req.user.hospital?.toString())) {
                return res.status(403).json({ message: 'Not authorized to delete this user' });
            }
        }

        await user.deleteOne();
        res.json({ message: 'User removed' });
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

// @desc    Admin reset user password
// @route   PUT /api/users/:id/reset-password
router.post('/:id/reset-password', protect, admin, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isAdmin = req.user.role === 'Admin' || req.user.role === 'hospital_admin';
        const isSuperAdmin = req.user.role === 'Super_Admin' || req.user.role === 'super_admin';

        // Authorization check
        if (isAdmin) {
            if (user.hospital?.toString() !== req.user.hospital?.toString()) {
                return res.status(403).json({ message: 'Not authorized to manage this user' });
            }
        }

        user.password = newPassword || 'password123';
        await user.save();
        res.json({ message: `Password for ${user.email} has been reset.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Self Reset password (Public)
// @route   POST /api/users/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email?.trim()}$`, 'i') } });
        if (user) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('[RESET PASSWORD] Server Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

export default router;
