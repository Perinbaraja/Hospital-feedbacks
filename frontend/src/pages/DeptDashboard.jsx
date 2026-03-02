import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'Assigned': 'badge badge-assigned',
        'COMPLETED': 'badge badge-resolved'
    };
    return <span className={statusClasses[status] || 'badge bg-gray-200'}>{status}</span>;
}

const DeptDashboard = () => {
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDeptFeedbacks = async () => {
        try {
            const { data } = await API.get(`/feedback/department/${user.department}`);
            setFeedbacks(data);
        } catch (error) {
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.department) {
            fetchDeptFeedbacks();
        }
    }, [user]);

    const handleResolve = async (id) => {
        try {
            await API.put(`/feedback/${id}`, { status: 'COMPLETED' });
            toast.success('Issue marked as COMPLETED!');
            // Refresh list
            fetchDeptFeedbacks();
        } catch (error) {
            toast.error('Error resolving issue');
        }
    };

    if (loading) return <div>Loading Assignments...</div>;

    return (
        <div>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ color: '#111827' }}>Department Tasks</h2>
                    <p style={{ color: '#6B7280', marginTop: '0.25rem' }}>Managing: <b>{user?.department}</b></p>
                </div>
            </div>

            {feedbacks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    No pending feedback assigned to your department.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {feedbacks.map(fb => (
                        <div key={fb._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: fb.status === 'COMPLETED' ? '4px solid #10B981' : '4px solid #F59E0B' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                                        {fb.patientName || 'Anonymous Guest'}
                                    </h4>
                                    {fb.patientEmail && <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>{fb.patientEmail}</p>}
                                </div>
                                <StatusBadge status={fb.status} />
                            </div>

                            {fb.comments && (
                                <div style={{ backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                                    <p style={{ color: '#374151' }}>"{fb.comments}"</p>
                                </div>
                            )}

                            {/* Show specific issue for this department */}
                            {fb.categories?.filter(r => r.department === user.department).map(r => (
                                <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Reported issue:</span>
                                    <span style={{ fontWeight: '600', color: '#111827' }}>
                                        {r.issue === 'Others' ? r.customText : r.issue}
                                    </span>
                                </div>
                            ))}

                            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                {fb.status !== 'COMPLETED' ? (
                                    <button
                                        onClick={() => handleResolve(fb._id)}
                                        className="btn-primary"
                                        style={{ backgroundColor: '#10B981' }}
                                    >
                                        Mark as COMPLETED
                                    </button>
                                ) : (
                                    <span style={{ color: '#10B981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        ✓ Rectified & User Notified
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

export default DeptDashboard;
