import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../api';
import './TvDashboard.css';

const TvDashboard = () => {
    const [searchParams] = useSearchParams();
    const hospitalId = searchParams.get('hospitalId');
    
    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Ticker state
    const [visibleFeedbacks, setVisibleFeedbacks] = useState([]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const feedbacksRef = useRef([]);

    const fetchData = useCallback(async () => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
            
            if (!hospital && hospitalId) {
                const hospRes = await API.get(`/hospital?hospitalId=${hospitalId}`);
                setHospital(hospRes.data);
            }

            const { data } = await API.get(`/feedback/tv/${hospitalId}`);
            
            // Requirements 2 & 5: Only IN_PROGRESS
            feedbacksRef.current = data;
            
            if (feedbacks.length === 0 && data.length > 0) {
                setFeedbacks(data);
                setVisibleFeedbacks(data.slice(0, 8)); // Start with first 8
            } else {
                setFeedbacks(data);
            }
            
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('TV Dashboard refresh error:', error);
        }
    }, [hospitalId, hospital, feedbacks.length]);

    useEffect(() => {
        if (hospitalId) {
            fetchData();
            const refreshTimer = setInterval(fetchData, 10000);
            const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
            return () => {
                clearInterval(refreshTimer);
                clearInterval(clockTimer);
            };
        }
    }, [fetchData, hospitalId]);

    // Requirement 5: Vertical Row Movement Logic
    useEffect(() => {
        if (feedbacks.length <= 1) {
            setVisibleFeedbacks(feedbacks);
            return;
        }

        const tickerTimer = setInterval(() => {
            setIsTransitioning(true);
            
            setTimeout(() => {
                setFeedbacks(prev => {
                    const next = [...prev];
                    const first = next.shift();
                    next.push(first);
                    return next;
                });
                setIsTransitioning(false);
            }, 600); // Match CSS transition time
        }, 5000); // Move every 5 seconds

        return () => clearInterval(tickerTimer);
    }, [feedbacks]);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="tv-dashboard-root">
            <header className="tv-header">
                <div className="tv-brand">
                    <h1 className="tv-title">Hospital Feedback Live Monitor</h1>
                    <div className="tv-badge-live">
                        <div className="tv-dot"></div>
                        LIVE FEED
                    </div>
                </div>
                <div className="tv-hospital-name">{hospital?.name}</div>
                <div className="tv-clock">
                    <div className="tv-time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    <div className="tv-date">{currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </header>

            <main className="tv-table-main">
                <div className="tv-table-header">
                    <div className="col-fid">Feedback ID</div>
                    <div className="col-dept">Department</div>
                    <div className="col-type">Feedback Type</div>
                    <div className="col-comment">Comment</div>
                    <div className="col-date">Date Submitted</div>
                    <div className="col-time">Time</div>
                    <div className="col-status">Status</div>
                </div>

                <div className="tv-rows-container">
                    {feedbacks.length === 0 && !loading ? (
                        <div className="tv-empty">
                            <div className="tv-empty-icon">✓</div>
                            <div className="tv-empty-text">No Active Feedback Investigations</div>
                        </div>
                    ) : (
                        <div className={`tv-rows-wrapper ${isTransitioning ? 'moving-up' : ''}`}>
                            {feedbacks.map((fb, index) => {
                                const cat = fb.categories?.[0] || {};
                                const isPositive = cat.reviewType === 'Positive';
                                return (
                                    <div key={fb._id} className={`tv-row ${isPositive ? 'pos-row' : 'neg-row'}`}>
                                        <div className="col-fid">{fb.feedbackId || '—'}</div>
                                        <div className="col-dept">{cat.department}</div>
                                        <div className="col-type">
                                            <span className={`type-tag ${isPositive ? 'tag-pos' : 'tag-neg'}`}>
                                                {isPositive ? '✨ Positive' : '⚠️ Negative'}
                                            </span>
                                        </div>
                                        <div className="col-comment">
                                            {fb.comments ? `"${fb.comments}"` : fb.categories[0]?.issue?.join(', ') || '—'}
                                        </div>
                                        <div className="col-date">{formatDate(fb.createdAt)}</div>
                                        <div className="col-time">{formatTime(fb.createdAt)}</div>
                                        <div className="col-status">
                                            <span className="status-label">{fb.status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <footer className="tv-footer-sync">
                <div className="sync-info">
                    <div className="tv-spinner"></div>
                    System Refresh Active • Last update: {lastUpdated.toLocaleTimeString()}
                </div>
                <div className="scrolling-ticker">
                    PLEASE NOTE: This dashboard is for monitoring purposes only. Staff members are actively investigating reported issues.
                </div>
            </footer>
        </div>
    );
};

export default TvDashboard;
