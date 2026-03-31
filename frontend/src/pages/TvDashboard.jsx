import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import API, { getAssetUrl } from '../api';
import './TvDashboard.css';
import { getHospitalConfig } from '../services/hospitalConfig';

const TvDashboard = () => {
    const [searchParams] = useSearchParams();
    const hospitalId = searchParams.get('hospitalId');
    
    const [feedbacks, setFeedbacks] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState(searchParams.get('deptId') || '');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());
    const [slideshowIndex, setSlideshowIndex] = useState(0);
    
    // Ticker state
    const [isTransitioning, setIsTransitioning] = useState(false);
    const feedbacksRef = useRef([]);

    const fetchData = useCallback(async () => {
        try {
            if (!hospitalId) {
                setLoading(false);
                return;
            }

            // Fetch hospital and departments in parallel
            const [hospRes, deptRes] = await Promise.all([
                getHospitalConfig({ hospitalId }),
                API.get(`/departments?hospitalId=${hospitalId}`)
            ]);
            
            setHospital(hospRes);
            setDepartments(deptRes.data || []);

            // Fetch TV feedback with optional departmentId from state
            const feedbackUrl = `/feedback/tv/${hospitalId}${selectedDeptId ? `?deptId=${selectedDeptId}` : ''}`;
            const { data } = await API.get(feedbackUrl);
            
            setFeedbacks(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('[TV Dashboard] Sync error:', error.message);
            if (error.response?.status >= 400) {
                setLoading(false);
            }
        }
    }, [hospitalId, selectedDeptId]);

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

    // Slideshow interval when no feedback
    useEffect(() => {
        if (feedbacks.length === 0 && departments.length > 0) {
            const slideTimer = setInterval(() => {
                setSlideshowIndex(prev => (prev + 1) % departments.length);
            }, 5000);
            return () => clearInterval(slideTimer);
        }
    }, [feedbacks, departments]);
    useEffect(() => {
        if (feedbacks.length <= 1) {
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
        { id: 'comment', label: 'Comment / Image', class: 'col-comment', width: 'minmax(300px, 1fr)' },
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
                    {isPositive ? 'POSITIVE' : 'NEGATIVE'}
                </span>
            );
            case 'comment': return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {fb.feedbackImage && (
                        <div className="fb-thumb">
                            <img src={getAssetUrl(fb.feedbackImage)} alt="Attach" />
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>
                            {(() => {
                                const isPos = cat.reviewType === 'Positive';
                                const tags = [
                                    ...(isPos ? [
                                        ...(Array.isArray(cat.positive_feedback) ? cat.positive_feedback : []),
                                        ...(Array.isArray(cat.positive_issues) ? cat.positive_issues : []),
                                        ...(Array.isArray(cat.issue) ? cat.issue : [])
                                    ] : [
                                        ...(Array.isArray(cat.negative_feedback) ? cat.negative_feedback : []),
                                        ...(Array.isArray(cat.negative_issues) ? cat.negative_issues : []),
                                        ...(Array.isArray(cat.issue) ? cat.issue : [])
                                    ])
                                ];
                                const uniqueTags = [...new Set(tags)].filter(t => t && String(t).trim() !== '');
                                return uniqueTags.length > 0 ? uniqueTags.join(', ') : (fb.comments ? `"${fb.comments}"` : 'Feedback Received');
                            })()}
                        </div>
                        {cat.customText && <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>{cat.customText}</div>}
                    </div>
                </div>
            );
            case 'date': return formatDate(fb.createdAt);
            case 'time': return formatTime(fb.createdAt);
            case 'status': return <span className="status-label">{fb.status || 'IN PROGRESS'}</span>;
            default: return null;
        }
    };

    return (
        <div className="tv-dashboard-root">
            <header className="tv-header">
                <div className="tv-brand">
                    <h1 className="tv-title">TV Feed Monitor</h1>
                    {departments.length > 0 ? (
                        <select 
                            className="tv-dept-filter"
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="tv-filter-fallback">Live Channel</span>
                    )}
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
                            <div className="tv-empty-icon">ALERT</div>
                            <div className="tv-empty-text">No Hospital ID Provided</div>
                            <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>Please access this dashboard via the link provided in the Admin Panel.</p>
                        </div>
                    ) : feedbacks.length === 0 && !loading ? (
                        <div className="tv-slideshow-container">
                            {departments.length > 0 ? (
                                <div className="tv-slide fade-in">
                                    <img 
                                        src={getAssetUrl(departments[slideshowIndex]?.imageUrl)} 
                                        alt="Slide" 
                                        className="tv-slide-img"
                                    />
                                    <div className="tv-slide-caption">
                                        <h2>{departments[slideshowIndex]?.name}</h2>
                                        <p>{departments[slideshowIndex]?.description || "Serving our patients with care."}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="tv-empty">
                                    <div className="tv-empty-icon">OK</div>
                                    <div className="tv-empty-text">Everything looks great! No issues reported.</div>
                                </div>
                            )}
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
