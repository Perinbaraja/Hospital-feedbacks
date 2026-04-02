import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import _User from '../models/User.js';
import _Hospital from '../models/Hospital.js';
import _Feedback from '../models/Feedback.js';
import { validateUserInput } from '../middleware/validation.js';
import { sendPasswordResetOtpEmail } from '../services/emailService.js';

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
            // Ensure hospitalId is always available as a string on req.user for isolated queries
            req.user.hospitalId = user.hospitalId || (user.hospital?._id || user.hospital || '').toString();
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
                const user = await User.findById(decoded.id)
                    .select('role isActive hospitalId hospital')
                    .lean();

                if (user && user.isActive) {
                    // Only fetch hospital activity when we actually need to validate a non-super-admin user.
                    const normalizedRole = (user.role || '').toLowerCase().replace(/[^a-z]/g, '');
                    const isSuper = normalizedRole === 'superadmin';

                    let hospitalIsActive = false;
                    if (!isSuper && user.hospital) {
                        const hospital = await Hospital.findById(user.hospital)
                            .select('isActive')
                            .lean();
                        hospitalIsActive = Boolean(hospital?.isActive);
                    }

                    if (isSuper || hospitalIsActive) {
                        req.user = user;
                        req.user.hospitalId = user.hospitalId || (user.hospital?._id || user.hospital || '').toString();
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
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {

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
                hospitalId: user.hospitalId || (user.hospital?._id || user.hospital || '').toString(),
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

// @desc    Request a password reset OTP
// @route   POST /api/users/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: `No account found for ${normalizedEmail}` });
        }

        const otp = String(crypto.randomInt(100000, 1000000)).padStart(6, '0');
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        user.passwordResetOTP = otp;
        user.passwordResetExpires = expires;
        await user.save();

        await sendPasswordResetOtpEmail(normalizedEmail, otp, req);

        res.json({ message: 'Password reset code sent to your email. It expires in 5 minutes.' });
    } catch (error) {
        console.error('[FORGOT PASSWORD] Server Error:', error);
        res.status(500).json({ message: 'Failed to send password reset code' });
    }
});

// @desc    Verify the password reset OTP
// @route   POST /api/users/verify-otp
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: `No account found for ${normalizedEmail}` });
        }

        if (!user.passwordResetOTP || !user.passwordResetExpires) {
            return res.status(400).json({ message: 'No pending reset request found. Please request a new OTP.' });
        }

        if (new Date(user.passwordResetExpires) < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Request a new code.' });
        }

        if (user.passwordResetOTP !== otp.trim()) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        res.json({ message: 'OTP verified. You may now reset your password.' });
    } catch (error) {
        console.error('[VERIFY OTP] Server Error:', error);
        res.status(500).json({ message: 'Failed to verify OTP' });
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
            hospital: targetHospital,
            hospitalId: targetHospital?.toString() || 'GLOBAL'
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
        const isSuperAdmin = normalizedAuthRole === 'superadmin';

        if (!isSuperAdmin) {
            filter.hospitalId = req.user.hospitalId;
        } else if (req.query.hospitalId) {
            filter.hospitalId = req.query.hospitalId;
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

// @desc    Self Reset password (Password reset by email only)
// @route   POST /api/users/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (!email || !newPassword || !otp) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: `No account found for ${normalizedEmail}` });
        }

        if (!user.passwordResetOTP || !user.passwordResetExpires) {
            return res.status(400).json({ message: 'No pending reset request found. Please request a new code.' });
        }

        if (new Date(user.passwordResetExpires) < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Request a new code.' });
        }

        if (user.passwordResetOTP !== otp.trim()) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        user.password = newPassword;
        user.passwordResetOTP = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('[RESET PASSWORD] Server Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

export default router;
