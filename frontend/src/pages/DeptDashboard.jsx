import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        'Pending': 'badge badge-pending',
        'IN PROGRESS': 'badge badge-assigned',
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
            fetchDeptFeedbacks();
        } catch (error) {
            toast.error('Error resolving issue');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div className="loader">Loading Dashboard...</div>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Department Console</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Managing operations for: <b style={{ color: 'var(--primary-dark)' }}>{user?.department}</b></p>
                </div>
                <button className="btn-outline" onClick={fetchDeptFeedbacks}>Refresh Tasks</button>
            </div>

            {feedbacks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>All clear!</h3>
                    <p style={{ color: 'var(--text-muted)' }}>No pending feedback or tasks assigned to your department at the moment.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
                    {feedbacks.map(fb => {
                        const isCompleted = fb.status === 'COMPLETED';
                        return (
                            <div key={fb._id} className="card" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem',
                                borderTop: isCompleted ? '4px solid var(--secondary)' : '4px solid var(--accent)',
                                opacity: isCompleted ? 0.85 : 1,
                                transition: 'var(--transitions)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Patient Assignment</div>
                                        <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                                            {fb.patientName || 'Anonymous Guest'}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={fb.status} />
                                </div>

                                {/* Show specific issue for this department */}
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                                    {fb.categories?.filter(r => r.department === user.department).map(r => (
                                        <div key={r._id}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    background: r.reviewType === 'Positive' ? '#dcfce7' : '#fee2e2',
                                                    color: r.reviewType === 'Positive' ? '#166534' : '#991b1b',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700
                                                }}>
                                                    {r.reviewType}
                                                </span>
                                                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                                    {Array.isArray(r.issue) ? r.issue.join(', ') : r.issue}
                                                </span>
                                            </div>
                                            {r.rating && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    Experience: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.rating}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {fb.comments && (
                                    <div style={{ position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid var(--primary-light)' }}>
                                        <p style={{ color: '#475569', fontSize: '0.9rem', fontStyle: 'italic' }}>"{fb.comments}"</p>
                                    </div>
                                )}

                                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {!isCompleted ? (
                                        <button
                                            onClick={() => handleResolve(fb._id)}
                                            className="btn-primary"
                                            style={{ background: 'var(--secondary)' }}
                                        >
                                            Mark as Resolved
                                        </button>
                                    ) : (
                                        <div style={{ color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                            <div style={{ background: '#dcfce7', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                                            Issue Rectified
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DeptDashboard;
