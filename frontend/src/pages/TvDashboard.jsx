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
            // Requirement 1 & 8: Public access via hospitalId parameter
            if (!hospitalId) {
                setLoading(false);
                return;
            }

            // Fetch hospital config periodically to pick up filter changes from Admin
            const hospRes = await API.get(`/hospital?hospitalId=${hospitalId}`);
            setHospital(hospRes.data);

            // Requirement 3 & 5: Fetch filtered feedback from the backend
            const { data } = await API.get(`/feedback/tv/${hospitalId}`);
            
            setFeedbacks(data);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('TV Dashboard refresh error:', error);
            // Don't set loading false here so it keeps trying if it's a transient error
        }
    }, [hospitalId]);

    useEffect(() => {
        if (hospitalId) {
            fetchData();
            // Requirement 5: Automatic Data Refresh every 10 seconds
            const refreshTimer = setInterval(fetchData, 10000);
            const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
            return () => {
                clearInterval(refreshTimer);
                clearInterval(clockTimer);
            };
        } else {
            setLoading(false);
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

    // Column Metadata for dynamic rendering
    const COLUMN_MAP = [
        { id: 'sno', label: 'S.No', class: 'col-sno', width: '80px' },
        { id: 'feedbackId', label: 'ID', class: 'col-fid', width: '150px' },
        { id: 'department', label: 'Department', class: 'col-dept', width: '200px' },
        { id: 'feedbackType', label: 'Type', class: 'col-type', width: '180px' },
        { id: 'comment', label: 'Comment', class: 'col-comment', width: 'minmax(300px, 1fr)' },
        { id: 'date', label: 'Date', class: 'col-date', width: '140px' },
        { id: 'time', label: 'Time', class: 'col-time', width: '130px' },
        { id: 'status', label: 'Status', class: 'col-status', width: '160px' }
    ];

    const activeColumns = COLUMN_MAP.filter(col => {
        const fallbacks = ['sno', 'department', 'feedbackType', 'comment', 'date', 'time', 'status'];
        const visible = hospital?.tvFilters?.visibleColumns && hospital.tvFilters.visibleColumns.length > 0
            ? hospital.tvFilters.visibleColumns
            : fallbacks;
        return visible.includes(col.id);
    });

    const gridStyle = {
        gridTemplateColumns: activeColumns.map(c => c.width).join(' ')
    };

    const renderCell = (col, fb, index) => {
        const cat = fb.categories?.[0] || {};
        const isPositive = cat.reviewType === 'Positive';

        switch(col.id) {
            case 'sno': return index + 1;
            case 'feedbackId': return fb.feedbackId || '—';
            case 'department': return cat.department || '—';
            case 'feedbackType': return (
                <span className={`type-tag ${isPositive ? 'tag-pos' : 'tag-neg'}`}>
                    {isPositive ? '✨ Positive' : '⚠️ Negative'}
                </span>
            );
            case 'comment': return fb.comments ? `"${fb.comments}"` : cat.issue?.join(', ') || '—';
            case 'date': return formatDate(fb.createdAt);
            case 'time': return formatTime(fb.createdAt);
            case 'status': return <span className="status-label">{fb.status}</span>;
            default: return null;
        }
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
                <div className="tv-table-header" style={gridStyle}>
                    {activeColumns.map(col => (
                        <div key={col.id} className={`${col.class} ${col.id === 'sno' ? 'text-center' : ''}`}>
                            {col.label}
                        </div>
                    ))}
                </div>

                <div className="tv-rows-container">
                    {!hospitalId ? (
                         <div className="tv-empty">
                            <div className="tv-empty-icon">⚠️</div>
                            <div className="tv-empty-text">No Hospital ID Provided</div>
                            <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>Please access this dashboard via the link provided in the Admin Panel.</p>
                        </div>
                    ) : feedbacks.length === 0 && !loading ? (
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
                                    <div key={fb._id} className={`tv-row ${isPositive ? 'pos-row' : 'neg-row'}`} style={gridStyle}>
                                        {activeColumns.map(col => (
                                            <div key={col.id} className={`${col.class} ${col.id === 'sno' ? 'text-center' : ''}`}>
                                                {renderCell(col, fb, index)}
                                            </div>
                                        ))}
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
