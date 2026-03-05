import { useState, useEffect } from 'react';
import API from '../api';
import toast from 'react-hot-toast';

const AdminStaff = () => {
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const hospitalId = queryParams.get('hospitalId');

    const [hospital, setHospital] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchData = async () => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
            const [hospRes, staffRes] = await Promise.all([
                API.get(`/hospital${hIdParam}`),
                API.get(`/users${hIdParam}`)
            ]);
            setHospital(hospRes.data);
            setStaffList(staffRes.data.filter(u => u.role === 'Dept_Head'));
        } catch (error) {
            toast.error('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateStaff = async (e) => {
        e.preventDefault();

        if (!department) {
            toast.error('Please select a department to assign');
            return;
        }

        setCreating(true);

        try {
            await API.post('/users', {
                name,
                email,
                password,
                role: 'Dept_Head',
                department,
                hospitalId
            });

            toast.success('Department Head account created!');
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
            toast.error('Error removing staff account');
        }
    };

    if (loading) return <div>Loading Staff Management...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Staff Management</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage department heads and their access credentials.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Create Staff Form */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--background)', paddingBottom: '1rem' }}>Add Dept Head</h3>

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
                            <label className="form-label">Temporary Password</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Assign Department</label>
                            <select
                                className="form-control"
                                required
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                <option value="" disabled>-- Select Department --</option>
                                {hospital?.departments.map(dept => (
                                    <option key={dept.name} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '0.5rem', width: '100%' }}>
                            {creating ? 'Creating Account...' : 'Add Account'}
                        </button>
                    </form>
                </div>

                {/* Existing Staff Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Active Department Heads</h3>
                            <span className="badge badge-assigned">{staffList.length} Active</span>
                        </div>

                        {staffList.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No department heads registered yet.</p>
                        ) : (
                            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Department</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map(staff => (
                                            <tr key={staff._id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{staff.name}</div>
                                                </td>
                                                <td>{staff.email}</td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem',
                                                        backgroundColor: '#f1f5f9',
                                                        color: 'var(--primary-dark)',
                                                        borderRadius: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #e2e8f0'
                                                    }}>
                                                        {staff.department}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleDeleteStaff(staff._id)}
                                                        className="btn-outline"
                                                        style={{
                                                            padding: '0.35rem 0.75rem',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--danger)',
                                                            borderColor: '#fee2e2'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        Remove
                                                    </button>
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
        </div>
    );
};

export default AdminStaff;
