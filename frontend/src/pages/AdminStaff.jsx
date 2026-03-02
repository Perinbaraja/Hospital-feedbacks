import { useState, useEffect } from 'react';
import API from '../api';
import toast from 'react-hot-toast';

const AdminStaff = () => {
    const [hospital, setHospital] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchData = async () => {
        try {
            const [hospRes, staffRes] = await Promise.all([
                API.get('/hospital'),
                API.get('/users')
            ]);
            setHospital(hospRes.data);
            setStaffList(staffRes.data.filter(u => u.role === 'Dept_Head'));

            if (hospRes.data?.departments?.length > 0) {
                setDepartment(hospRes.data.departments[0]);
            }
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
        setCreating(true);

        try {
            await API.post('/users', {
                name,
                email,
                password,
                role: 'Dept_Head',
                department
            });

            toast.success('Department Head account created!');
            // Reset form
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

            {/* Create Staff Form */}
            <div className="card" style={{ alignSelf: 'start' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>Invite Department Head</h2>

                <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email Address / Username</label>
                        <input
                            type="email"
                            className="form-control"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Temporary Password</label>
                        <input
                            type="password"
                            className="form-control"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Assign to Department</label>
                        <select
                            className="form-control"
                            required
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                        >
                            {hospital?.departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
                        {creating ? 'Creating Account...' : 'Create Staff Account'}
                    </button>
                </form>
            </div>

            {/* Existing Staff List */}
            <div className="card" style={{ alignSelf: 'start' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>Active Department Heads</h2>

                {staffList.length === 0 ? (
                    <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem 0' }}>No department heads registered yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {staffList.map(staff => (
                            <div key={staff._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                                <div>
                                    <h4 style={{ color: '#111827', fontSize: '1rem', marginBottom: '0.25rem' }}>{staff.name}</h4>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                                        <span>{staff.email}</span>
                                        <span style={{ fontWeight: 500, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                                            {staff.department}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteStaff(staff._id)}
                                    style={{ color: '#EF4444', transition: 'color 0.2s' }}
                                    title="Delete Account"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdminStaff;
