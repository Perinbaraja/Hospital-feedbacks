import { useState, useEffect, useCallback } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { getHospitalConfig } from '../services/hospitalConfig';
import useIsMobile from '../hooks/useIsMobile';

const AdminStaff = () => {
    const { user } = useAuth();
    const isMobile = useIsMobile(768);
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const hospitalId = queryParams.get('hospitalId');

    const [hospital, setHospital] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiVersion, setApiVersion] = useState('Checking...');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Dept_Head'); // Default to Dept Head
    const [department, setDepartment] = useState('');
    const [creating, setCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [resetPassword, setResetPassword] = useState('password123');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);

    // CRITICAL: Block Super Admin from accessing staff management
    if (user?.role?.toLowerCase() === 'super_admin') {
        const redirPath = hospitalId ? `/admin/settings?hospitalId=${hospitalId}` : '/super-admin';
        return <Navigate to={redirPath} replace />;
    }

    const fetchData = useCallback(async () => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
            const [hospRes, staffRes] = await Promise.all([
                getHospitalConfig(hospitalId ? { hospitalId } : {}),
                API.get(`/users${hIdParam}`)
            ]);
            setHospital(hospRes);
            // Show only clinical/department staff (Dept Heads) in the directory
            setStaffList(staffRes.data.filter(u => ['Dept_Head', 'Admin', 'hospital_admin'].includes(u.role)));
        } catch {
            toast.error('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    }, [hospitalId]);

    useEffect(() => {
        fetchData();
        const fetchVersion = async () => {
            try {
                const { data } = await API.get('/users/version');
                setApiVersion(data.version);
            } catch {
                setApiVersion('Unknown (API Error or Older Server)');
            }
        };
        fetchVersion();
    }, [fetchData]);

    const handleCreateStaff = async (e) => {
        e.preventDefault();

        // If Dept Head, department is mandatory
        if (role === 'Dept_Head' && !department) {
            toast.error('Please select a department for the Dept Head');
            return;
        }

        setCreating(true);

        try {
            await API.post('/users', {
                name,
                email,
                password,
                role,
                department: role === 'Dept_Head' ? department : '',
                hospitalId
            });

            toast.success(`${role.replace('_', ' ')} account created successfully!`);
            setName('');
            setEmail('');
            setPassword('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating staff account');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Are you sure you want to remove this staff account?')) return;

        try {
            await API.delete(`/users/${id}`);
            toast.success('Staff account removed');
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || 'Error removing staff account';
            toast.error(msg);
            console.error('Delete Failure Context:', {
                errorMsg: msg,
                adminRole: user?.role,
                adminHosp: user?.hospital?._id,
                targetHosp: staffList.find(s => s._id === id)?.hospital
            });
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        if (!resetPassword.trim()) {
            toast.error('Please enter a new password');
            return;
        }
        try {
            setResettingPassword(true);
            await API.post(`/users/${resetTarget.id}/reset-password`, { newPassword: resetPassword.trim() });
            toast.success(`Password updated for ${resetTarget.name}`);
            setResetTarget(null);
            setResetPassword('password123');
            setShowResetPassword(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error resetting password');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleToggleRole = async (staff) => {
        const newRole = ['Admin', 'hospital_admin'].includes(staff.role) ? 'Dept_Head' : 'Admin';
        const confirmMsg = `Do you want to change ${staff.name}'s role to ${newRole.replace('_', ' ')}?`;
        
        if (!window.confirm(confirmMsg)) return;

        try {
            await API.put(`/users/${staff._id}/role`, { role: newRole });
            toast.success(`Role updated successfully for ${staff.name}`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating role');
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {loading && (
                <div style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--surface)', padding: '6px 14px',
                    borderRadius: '2rem', border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)', zIndex: 20
                }}>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updating directory...</span>
                </div>
            )}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Staff Management</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Manage and provision access codes for department heads.
                        <span style={{ marginLeft: '1rem', fontStyle: 'italic', fontSize: '0.75rem', opacity: 0.6 }}>
                            API: {apiVersion}
                        </span>
                    </p>
                </div>
            </div>

            <div className="responsive-aside-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 400px) 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Create Staff Form */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--background)', paddingBottom: '1rem' }}>Add New Member</h3>

                    <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Dr. John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email / Username</label>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="Email address"
                                required
                                autoComplete="off"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Login Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-control"
                                    placeholder="Enter secure password"
                                    required
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Access Level</label>
                            <select
                                className="form-control"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="Dept_Head">Department Head</option>
                                <option value="Admin">Hospital Administrator</option>
                            </select>
                        </div>

                        {role === 'Dept_Head' && (
                            <div className="form-group fade-in">
                                <label className="form-label">Assign Department</label>
                                <select
                                    className="form-control"
                                    required
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                >
                                    <option value="" disabled>-- Select Department --</option>
                                    {hospital?.departments?.map(dept => (
                                        <option key={dept.name} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '0.5rem', width: '100%' }}>
                            {creating ? 'Creating Account...' : 'Add Account'}
                        </button>
                    </form>
                </div>

                {/* Existing Staff Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Registered Staff</h3>
                            <span className="badge badge-assigned">{staffList.length} Active Accounts</span>
                        </div>

                        {staffList.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No staff registered yet.</p>
                        ) : (
                            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Account Type</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map(staff => (
                                            <tr key={staff._id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{staff.name}</div>
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>{staff.email}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.5rem',
                                                            backgroundColor: ['Admin', 'hospital_admin'].includes(staff.role) ? '#ede9fe' : '#f1f5f9',
                                                            color: ['Admin', 'hospital_admin'].includes(staff.role) ? '#6d28d9' : '#475569',
                                                            borderRadius: '0.4rem',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            width: 'fit-content',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {['Admin', 'hospital_admin'].includes(staff.role) ? 'Admin' : 'Staff'}
                                                        </span>
                                                        {staff.role === 'Dept_Head' && (
                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{staff.department}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>

                                                        <button
                                                            onClick={() => {
                                                                setResetTarget({ id: staff._id, name: staff.name });
                                                                setResetPassword('password123');
                                                                setShowResetPassword(false);
                                                            }}
                                                            className="btn-outline"
                                                            style={{
                                                                padding: '0.3rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                color: 'var(--primary)',
                                                                borderColor: '#e2e8f0'
                                                            }}
                                                        >
                                                            Pwd
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStaff(staff._id)}
                                                            className="btn-outline"
                                                            style={{
                                                                padding: '0.3rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                color: 'var(--danger)',
                                                                borderColor: '#fee2e2'
                                                            }}
                                                        >
                                                            X
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {resetTarget && (
                <>
                    <button
                        type="button"
                        className="responsive-sidebar-backdrop"
                        style={{ zIndex: 999 }}
                        onClick={() => {
                            if (!resettingPassword) setResetTarget(null);
                        }}
                    />
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: isMobile ? 'calc(100vw - 2rem)' : 'min(460px, calc(100vw - 2rem))',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '1.25rem',
                            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)',
                            padding: isMobile ? '1rem' : '1.5rem',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Reset Password</h3>
                                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Enter new password for <strong>{resetTarget.name}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-outline"
                                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '999px' }}
                                onClick={() => {
                                    if (!resettingPassword) setResetTarget(null);
                                }}
                            >
                                X
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showResetPassword ? 'text' : 'password'}
                                    className="form-control"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowResetPassword((prev) => !prev)}
                                >
                                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="responsive-stack-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setResetTarget(null)}
                                disabled={resettingPassword}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleResetPassword}
                                disabled={resettingPassword}
                            >
                                {resettingPassword ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminStaff;
