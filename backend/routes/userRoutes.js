import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import _User from '../models/User.js';
import _Hospital from '../models/Hospital.js';
import _Feedback from '../models/Feedback.js';
import { validateUserInput } from '../middleware/validation.js';

const User = _User?.default || _User;
const Hospital = _Hospital?.default || _Hospital;
const Feedback = _Feedback?.default || _Feedback;

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
            const user = await User.findById(decoded.id).populate('hospital');
            
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: 'Your account is deactivated.' });
            }

            // Block access if hospital is deactivated (except for Super Admins)
            const normalizedRole = (user.role || '').toLowerCase().replace(/[^a-z]/g, '');
            if (normalizedRole !== 'superadmin' && user.hospital && !user.hospital.isActive) {
                return res.status(403).json({ message: 'Access denied: Hospital is deactivated by Super Admin.' });
            }

            req.user = user;
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
                const user = await User.findById(decoded.id).populate('hospital');
                if (user && user.isActive) {
                    // Only set req.user if hospital is also active OR user is super admin
                    const normalizedRole = (user.role || '').toLowerCase().replace(/[^a-z]/g, '');
                    const isSuper = normalizedRole === 'superadmin';
                    if (isSuper || (user.hospital && user.hospital.isActive)) {
                        req.user = user;
                    }
                }
            }
        } catch (error) {
            console.error('Optional token verification failed:', error.message);
        }
    }
    return next();
};

// Admin middleware
export const admin = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
    const isHospitalAdmin = ['admin', 'hospitaladmin'].includes(role);
    const isSuperAdmin = role === 'superadmin';

    if (isHospitalAdmin || isSuperAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

// Super Admin middleware
export const superAdmin = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
    if (role === 'superadmin') {
        next();
    } else {
        const actualRole = req.user?.role || 'UNDEFINED';
        console.warn(`[SUPER_ADMIN] Access Denied: User ${req.user?.email} has role ${actualRole}`);
        res.status(403).json({ 
            message: `Not authorized as a Super Admin (Your role: ${actualRole})` 
        });
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

const getHospitalIdString = (hospital) => {
    if (!hospital) return null;
    if (hospital._id) return hospital._id.toString().trim();
    return hospital.toString().trim();
};

router.get('/version', (req, res) => {
    res.json({ version: '2026-03-19-v3-robust-id-checks' });
});

// @desc    Auth user & get token
router.post('/login', validateUserInput, async (req, res) => {
    const email = req?.body?.email?.trim();
    const password = req?.body?.password;
console.log(`email: ${email}`);
console.log(`password: ${password}`);
    if (!email || !password) {
        console.warn("[LOGIN] Missing email or password");
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        console.log(`[LOGIN] Attempt for email: ${email}`);

        const user = await User.findOne({
            email: email.toLowerCase()
        }).populate('hospital');

        if (user && (await user.matchPassword(password))) {
            if (!user.isActive) {
                return res.status(403).json({ message: 'Account deactivated' });
            }

            if (user.role?.toLowerCase() === 'dept_head') {
                console.log(`[LOGIN] SUCCESS: Department Head ${user.name} logged in for facility ${user.hospital?.name || 'N/A'}`);
            }

            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospital: user.hospital,
                department: user.department,
                token: generateToken(user._id),
            });
        }

        return res.status(401).json({ message: 'Invalid email or password' });

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
            email: email?.trim().toLowerCase()
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const { hospitalId } = req.body;
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isSuper = normalizedAuthRole === 'superadmin';
        
        const targetHospital = (hospitalId && isSuper) ? hospitalId : req.user.hospital;

        const user = await User.create({
            name: name?.trim(),
            email: email?.trim().toLowerCase(),
            password: password,
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
        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(normalizedAuthRole);
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

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

        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(normalizedAuthRole);
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (isAdmin || isSuperAdmin) {
            if (!isSuperAdmin) {
                const userHospId = getHospitalIdString(user.hospital);
                const adminHospId = getHospitalIdString(req.user.hospital);

                if (userHospId !== adminHospId) {
                    return res.status(403).json({ message: `Not authorized to delete this user (facility mismatch: ${userHospId} vs ${adminHospId})` });
                }
            }
        } else {
            return res.status(403).json({ message: 'Not authorized: Admin privileges required' });
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

        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(normalizedAuthRole);
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (isAdmin || isSuperAdmin) {
            if (!isSuperAdmin) {
                const userHospId = getHospitalIdString(user.hospital);
                const adminHospId = getHospitalIdString(req.user.hospital);

                if (userHospId !== adminHospId) {
                    return res.status(403).json({ message: `Not authorized to manage this user (facility mismatch: ${userHospId} vs ${adminHospId})` });
                }
            }
        } else {
            return res.status(403).json({ message: 'Not authorized: Admin privileges required' });
        }

        user.password = newPassword || 'password123';
        await user.save();
        res.json({ message: `Password for ${user.email} has been reset.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
router.put('/:id/role', protect, admin, async (req, res) => {
    const { role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const normalizedAuthRole = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
        const isAdmin = ['admin', 'hospitaladmin'].includes(normalizedAuthRole);
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (isAdmin || isSuperAdmin) {
            if (!isSuperAdmin) {
                const userHospId = getHospitalIdString(user.hospital);
                const adminHospId = getHospitalIdString(req.user.hospital);

                if (userHospId !== adminHospId) {
                    return res.status(403).json({ message: `Not authorized to manage this user (facility mismatch: ${userHospId} vs ${adminHospId})` });
                }
            }
        } else {
            return res.status(403).json({ message: 'Not authorized: Admin privileges required' });
        }

        // Restrict role changes (cannot promote to Super Admin)
        const targetRoleNormalized = (role || '').toLowerCase().replace(/[^a-z]/g, '');
        if (targetRoleNormalized === 'superadmin' && !isSuperAdmin) {
            return res.status(403).json({ message: 'Not authorized to assign Super Admin role' });
        }

        user.role = role;
        await user.save();
        res.json({ message: `Role for ${user.email} updated to ${role}.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating role' });
    }
});

// @desc    Self Reset password (Requires old password verification)
// @route   POST /api/users/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    try {
        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }
        const user = await User.findOne({ email: email?.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Require old password for verification
        if (!oldPassword) {
            return res.status(400).json({ message: 'Current password is required for verification' });
        }
        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('[RESET PASSWORD] Server Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

export default router;
