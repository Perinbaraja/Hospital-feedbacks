import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';

const TrackFeedback = () => {
    const { id: urlId } = useParams();
    const [trackingId, setTrackingId] = useState(urlId || '');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleTrack = async (e) => {
        if (e) e.preventDefault();
        if (!trackingId.trim()) return;

        setLoading(true);
        try {
            const { data } = await API.get(`/feedback/track/${trackingId.trim()}`);
            setFeedback(data);
        } catch (error) {
            toast.error('Invalid Tracking ID or Feedback not found');
            setFeedback(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="public-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#1e293b' }}>Track Your Feedback</h1>
                    <p style={{ color: '#64748b' }}>Enter your Reference ID to check the investigation status.</p>
                </div>

                <form onSubmit={handleTrack} style={{ marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 64abc123..."
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '1px' }}
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '50px' }} disabled={loading}>
                        {loading ? 'Searching...' : 'Check Status'}
                    </button>
                </form>

                {feedback && (
                    <div style={{
                        background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem',
                        border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>
                            Current Status
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: feedback.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
                            }}>
                                {feedback.status === 'COMPLETED' ? '✅' : '⏳'}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{feedback.status.toLowerCase()}</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                    {feedback.status === 'Pending' ? 'Received and waiting for review.' :
                                        feedback.status === 'IN PROGRESS' ? 'Under investigation by medical staff.' :
                                            'Investigation resolved. Thank you for your feedback!'}
                                </p>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <span>Hospital:</span>
                                <b>{feedback.hospital?.name}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Submitted:</span>
                                <b>{new Date(feedback.createdAt).toLocaleDateString()}</b>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                        ← Back to Hospital Site
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TrackFeedback;
