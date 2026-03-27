import { useState, useEffect, useCallback } from 'react';
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
    const [selectedFeedback, setSelectedFeedback] = useState(null); // For Note Modal
    const [newNote, setNewNote] = useState('');
    const [postingNote, setPostingNote] = useState(false);

    const fetchDeptFeedbacks = useCallback(async (retryCount = 0) => {
        try {
            if (!user?.department) return;
            const encodedDept = encodeURIComponent(user.department);
            const { data } = await API.get(`/feedback/department/${encodedDept}`);
            setFeedbacks(data);
            setLoading(false);
        } catch (error) {
            console.error('Dept fetch error:', error);
            if (retryCount < 2) {
                console.log(`Retrying dept fetch (${retryCount + 1})...`);
                setTimeout(() => fetchDeptFeedbacks(retryCount + 1), 1500);
            } else {
                toast.error('Failed to load assignments. Please refresh or check connection.');
                setLoading(false);
            }
        }
    }, [user?.department]);

    // Keep side-panel data in sync without triggering full fetch loops
    useEffect(() => {
        if (selectedFeedback) {
            const refreshed = feedbacks.find(f => f._id === selectedFeedback._id);
            if (refreshed && JSON.stringify(refreshed.notes) !== JSON.stringify(selectedFeedback.notes)) {
                setSelectedFeedback(refreshed);
            }
        }
    }, [feedbacks, selectedFeedback]);

    useEffect(() => {
        if (user && user.department) {
            fetchDeptFeedbacks();
        }
    }, [fetchDeptFeedbacks, user]);

    const handleResolve = async (id) => {
        try {
            await API.put(`/feedback/${id}`, { status: 'COMPLETED' });
            toast.success('Issue marked as Resolved!');
            fetchDeptFeedbacks();
        } catch {
            toast.error('Error resolving issue');
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setPostingNote(true);
        try {
            await API.post(`/feedback/${selectedFeedback._id}/notes`, { text: newNote });
            toast.success('Internal note added');
            setNewNote('');
            fetchDeptFeedbacks();
        } catch {
            toast.error('Failed to add note');
        } finally {
            setPostingNote(false);
        }
    };

    const splitTags = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(t => t && String(t).trim() !== '');
        return String(val).split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0);
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Syncing...</span>
                </div>
            )}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Department Ops console</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active investigations for: <b style={{ color: 'var(--primary-dark)' }}>{user?.department}</b></p>
                </div>
                <button className="btn-outline" onClick={() => window.location.reload()}>Refresh Tasks</button>
            </div>

            {(!user?.department) ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '2px dashed var(--danger)' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 800 }}>!</div>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--danger)' }}>Configuration Error</h3>
                    <p style={{ color: 'var(--text-muted)' }}>This account is not assigned to any department. Please contact your Hospital Admin.</p>
                </div>
            ) : feedbacks.length === 0 && !loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 800 }}>DONE</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Operations Clear</h3>
                    <p style={{ color: 'var(--text-muted)' }}>No pending investigations assigned to your department.</p>
                </div>
            ) : (
                <div className="table-container" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>#</th>
                                <th style={{ minWidth: '120px' }}>FEEDBACK ID</th>
                                <th>PATIENT</th>
                                <th style={{ minWidth: '150px' }}>POSITIVE</th>
                                <th style={{ minWidth: '150px' }}>NEGATIVE</th>
                                <th style={{ minWidth: '200px' }}>COMMENTS</th>
                                <th style={{ width: '100px' }}>STATUS</th>
                                <th style={{ width: '100px' }}>NOTES</th>
                                <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.map((fb, idx) => {
                                const isCompleted = fb.status === 'COMPLETED';
                                const deptFeedback = fb.categories?.find(c =>
                                    c.department?.trim().toLowerCase() === user.department?.trim().toLowerCase()
                                ) || fb.categories?.[0] || {};

                                const isPositive = deptFeedback.reviewType === 'Positive';
                                const isNegative = deptFeedback.reviewType === 'Negative';

                                return (
                                    <tr key={fb._id} style={{ opacity: isCompleted ? 0.7 : 1 }}>
                                        <td>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary-dark)' }}>{fb.feedbackId || '—'}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{fb.patientName || 'Anonymous'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(fb.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                                                {(() => {
                                                    const tags = [
                                                        ...splitTags(deptFeedback.positive_feedback),
                                                        ...splitTags(deptFeedback.positive_issues),
                                                        ...(isPositive ? splitTags(deptFeedback.issue) : [])
                                                    ];
                                                    const uniqueTags = [...new Set(tags)];
                                                    return uniqueTags.length > 0 ? (
                                                        <span style={{ fontWeight: 500 }}>{uniqueTags.join(', ')}</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                                                {(() => {
                                                    const tags = [
                                                        ...splitTags(deptFeedback.negative_feedback),
                                                        ...splitTags(deptFeedback.negative_issues),
                                                        ...(isNegative ? splitTags(deptFeedback.issue) : [])
                                                    ];
                                                    const uniqueTags = [...new Set(tags)];
                                                    return uniqueTags.length > 0 ? (
                                                        <span style={{ fontWeight: 500 }}>{uniqueTags.join(', ')}</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'normal' }}>
                                                {fb.comments ? `"${fb.comments}"` : '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge status={fb.status} />
                                        </td>
                                        <td>
                                            <button
                                                className="btn-outline"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                onClick={() => setSelectedFeedback(fb)}
                                            >
                                                Notes: {fb.notes?.length || 0}
                                            </button>
                                        </td>
                                         <td style={{ textAlign: 'right' }}>
                                             {!isCompleted ? (
                                                 <button 
                                                    className="btn-success" 
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '4px' }} 
                                                    onClick={() => handleResolve(fb._id)}
                                                >
                                                    Mark Resolved
                                                </button>
                                             ) : (
                                                 <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                    Closed
                                                 </span>
                                             )}
                                         </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Notes Side-Panel */}
            {selectedFeedback && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
                    background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
                    zIndex: 1000, padding: '2rem', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>Staff Discussion</h3>
                        <button className="btn-icon" style={{ padding: '8px' }} onClick={() => setSelectedFeedback(null)}>✕</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedFeedback.notes && selectedFeedback.notes.length > 0 ? (
                            selectedFeedback.notes.map((note, i) => (
                                <div key={i} style={{
                                    padding: '1rem', background: note.senderRole === 'Admin' ? '#f0f9ff' : '#f8fafc',
                                    borderRadius: '0.75rem', border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                                        <b style={{ color: 'var(--primary-dark)' }}>{note.senderName} ({note.senderRole})</b>
                                        <span style={{ color: '#94a3b8' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>{note.text}</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                                <p>No internal notes yet.</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAddNote} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                        <textarea
                            className="form-control"
                            placeholder="Type an internal note..."
                            style={{ height: '100px', marginBottom: '1rem', resize: 'none' }}
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={postingNote}>
                            {postingNote ? 'Saving...' : 'Add Note'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default DeptDashboard;

