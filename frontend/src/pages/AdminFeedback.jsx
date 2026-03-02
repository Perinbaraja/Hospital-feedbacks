import { useState, useEffect } from 'react';
import API from '../api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'Assigned': 'badge badge-assigned',
        'COMPLETED': 'badge badge-resolved'
    };
    return <span className={statusClasses[status] || 'badge bg-gray-200'}>{status}</span>;
};

const AdminFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [fbRes, hospRes] = await Promise.all([
                API.get('/feedback'),
                API.get('/hospital')
            ]);
            setFeedbacks(fbRes.data);
            setHospital(hospRes.data);
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAssign = async (id, department) => {
        try {
            await API.put(`/feedback/${id}`, { assignedTo: department });
            toast.success(`Feedback assigned to ${department}`);
            fetchData();
        } catch (error) {
            toast.error('Error assigning feedback');
        }
    };

    if (loading) return <div>Loading Dashboard...</div>;

    return (
        <div>
            <h2 style={{ marginBottom: '2rem', color: '#111827' }}>Patient Feedback Overview</h2>

            {feedbacks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    No feedback received yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {feedbacks.map(fb => (
                        <div key={fb._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                                        {fb.patientName || 'Anonymous Guest'}
                                    </h4>
                                    {fb.patientEmail && <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>{fb.patientEmail}</p>}
                                    <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <StatusBadge status={fb.status} />
                                </div>
                            </div>

                            {fb.comments && (
                                <div style={{ backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #E5E7EB' }}>
                                    <p style={{ fontStyle: 'italic', color: '#4B5563' }}>"{fb.comments}"</p>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 0', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                                {fb.categories?.map(r => (
                                    <div key={r._id} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.department}</span>
                                        <span style={{ fontWeight: '500', color: '#111827' }}>
                                            {r.issue === 'Others' ? r.customText : r.issue}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Assign to Department:</span>
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', padding: '0.5rem' }}
                                        value={fb.assignedTo || ''}
                                        onChange={(e) => handleAssign(fb._id, e.target.value)}
                                        disabled={fb.status === 'COMPLETED'}
                                    >
                                        <option value="" disabled>Select Dept...</option>
                                        {hospital?.departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                {fb.status === 'COMPLETED' && (
                                    <span style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        ✓ COMPLETED
                                    </span>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminFeedback;
