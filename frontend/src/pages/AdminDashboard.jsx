import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAssetUrl } from '../api';
import toast from 'react-hot-toast';
import { Activity, CheckCircle, Clock, TrendingUp, BarChart3, Users, LayoutDashboard, Settings } from 'lucide-react';
import { getHospitalConfig } from '../services/hospitalConfig';
import { fetchAdminDashboard, getCachedAdminDashboard } from '../services/adminDashboardCache';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, color, icon, trend }) => {
    const Icon = icon;
    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'white', borderRadius: '1.25rem', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: `${color}15`, color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} />
                </div>
                {trend && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: trend > 0 ? '#10b981' : '#ef4444', background: trend > 0 ? '#ecfdf5' : '#fef2f2', padding: '4px 8px', borderRadius: '1rem' }}>
                        {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 'medium' }}>{title}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>{value}</h3>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const isMobile = useIsMobile(768);
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const rawHospitalId = searchParams.get('hospitalId');
    const queryHospitalId = rawHospitalId && !['undefined', 'null'].includes(rawHospitalId.toLowerCase()) ? rawHospitalId.trim() : '';
    const hospitalId = queryHospitalId || user?.hospitalId || user?.hospital?._id || '';
    const navigate = useNavigate();

    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalEncounters, setTotalEncounters] = useState(0);
    const [positive, setPositive] = useState(0);
    const [negative, setNegative] = useState(0);
    const [resolved, setResolved] = useState(0);
    const [deptData, setDeptData] = useState([]);

    const hQuery = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';

    const applyDashboardData = useCallback((data) => {
        if (!data) return;
        setTotalEncounters(data.totalEncounters || 0);
        setPositive(data.positiveCount || 0);
        setNegative(data.negativeCount || 0);
        setResolved(data.resolvedIssues || 0);
        setDeptData(data.deptDistribution || []);
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadDashboard = async () => {
            const cachedDashboard = getCachedAdminDashboard(hospitalId ? { hospitalId } : {});
            if (cachedDashboard && isActive) {
                applyDashboardData(cachedDashboard);
                setLoading(false);
                setIsRefreshing(true);
            }

            try {
                const [dashboardData, hospitalData] = await Promise.all([
                    fetchAdminDashboard(hospitalId ? { hospitalId } : {}, { forceRefresh: Boolean(cachedDashboard) }),
                    getHospitalConfig(hospitalId ? { hospitalId } : {})
                ]);

                if (!isActive) return;

                applyDashboardData(dashboardData);
                setHospital(hospitalData);
            } catch (err) {
                if (!isActive) return;
                console.error('Dashboard fetch error:', err);
                if (!cachedDashboard) {
                    toast.error('Failed to load dashboard data');
                }
            } finally {
                if (!isActive) return;
                setLoading(false);
                setIsRefreshing(false);
            }
        };

        loadDashboard();

        const intervalId = window.setInterval(async () => {
            if (document.hidden) return;

            try {
                setIsRefreshing(true);
                const dashboardData = await fetchAdminDashboard(hospitalId ? { hospitalId } : {}, { forceRefresh: true });
                if (!isActive) return;
                applyDashboardData(dashboardData);
            } catch (err) {
                if (isActive) {
                    console.error('Dashboard background refresh failed:', err);
                }
            } finally {
                if (isActive) {
                    setIsRefreshing(false);
                }
            }
        }, 30000);

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [applyDashboardData, hospitalId, hQuery]);

    if (loading) return (
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>Loading dashboard...</div>
            </div>
        </div>
    );


    const sentimentTotal = positive + negative;
    const positivePercent = sentimentTotal > 0 ? Math.round((positive / sentimentTotal) * 100) : 0;

    return (
        <div style={{ padding: '2rem 0' }}>
            {isRefreshing && (
                <div style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.96)',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                    border: '1px solid #e2e8f0',
                    zIndex: 30
                }}>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Refreshing dashboard...</span>
                </div>
            )}
            <div className="page-header" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="page-title text-colorful" style={{ fontSize: '2rem' }}>Performance Dashboard</h2>
                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Operational overview and real-time feedback orchestration.</p>
                </div>
                <div className="responsive-stack-actions" style={{ display: 'flex', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
                    <button className="btn-primary" onClick={() => navigate(`/admin/feedbacks${hQuery}`)} style={{ background: 'var(--primary)', height: '48px', padding: '0 1.5rem', borderRadius: '12px' }}>
                        Live Feedback Table
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard
                    title="Total Encounters"
                    value={totalEncounters}
                    color="#6366f1"
                    icon={LayoutDashboard}
                />
                <StatCard
                    title="Positive Feedback"
                    value={positive}
                    color="#f59e0b"
                    icon={Clock}
                />
                <StatCard
                    title="Negative Feedback"
                    value={negative}
                    color="#10b981"
                    icon={CheckCircle}
                />
                <StatCard
                    title="Resolved Issues"
                    value={resolved}
                    color="#8b5cf6"
                    icon={TrendingUp}
                />
            </div>

            <div className="responsive-aside-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Facility Info */}
                    <div className="card responsive-content-row" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', background: 'linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white', fontWeight: 800 }}>
                            {hospital?.name?.charAt(0) || 'H'}
                        </div>
                        <div className="responsive-content-row" style={{ display: 'flex', flex: 1, gap: '2.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Location</p>
                                <p style={{ fontWeight: 700, color: '#334155' }}>{hospital?.location || 'Not Specified'}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{hospital?.district}{hospital?.district && ', '}{hospital?.state}</p>
                            </div>
                            <div className="responsive-hide-divider" style={{ width: '1px', background: '#e2e8f0' }}></div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Contact</p>
                                <p style={{ fontWeight: 700, color: '#334155' }}>{hospital?.phone || 'No Phone Set'}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Technical ID: {hospital?.uniqueId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary: Service Matrix */}
                    <div className="card" style={{ padding: '2rem', borderRadius: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Facility Service Matrix</h3>
                            <Activity size={20} color="#94a3b8" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {!hospital?.departments || hospital.departments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No departments configured for this hospital.</p>
                            ) : (
                                hospital.departments.map((dept) => {
                                    // Case-insensitive lookup for department name in distribution data
                                    const distItem = deptData.find(d => (d.name || '').toLowerCase() === (dept.name || '').toLowerCase());
                                    const count = distItem ? distItem.count : 0;
                                    const percentage = totalEncounters > 0 ? Math.round((count / totalEncounters) * 100) : 0;
                                    return (
                                        <div key={dept.name} style={{ opacity: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {dept?.imageUrl ? (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            <img src={getAssetUrl(dept.imageUrl)} alt="" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Activity size={16} color="#94a3b8" />
                                                        </div>
                                                    )}
                                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{dept.name}</span>
                                                </div>
                                                <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>{count} feedback</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${percentage}%`, height: '100%', background: count > 0 ? 'var(--primary)' : '#e2e8f0', borderRadius: '10px' }}></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Sentiment Distribution */}
                <div className="card" style={{ padding: '2rem', borderRadius: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>Patient Sentiment</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                <circle
                                    cx="80" cy="80" r="70"
                                    fill="transparent"
                                    stroke="var(--primary)"
                                    strokeWidth="12"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * positivePercent / 100)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div style={{ position: 'absolute', textAlign: 'center' }}>
                                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{positivePercent}%</span>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, margin: 0 }}>POSITIVE</p>
                            </div>
                        </div>

                        <div style={{ width: '100%', display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Positive</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{positive}</p>
                            </div>
                            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Negative</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{negative}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '2.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Quick Actions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <button
                        onClick={() => navigate(`/admin/staff${hQuery}`)}
                        className="btn-outline"
                        style={{ height: '72px', borderRadius: '1rem', borderStyle: 'dashed', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1.5rem' }}
                    >
                        <Users size={20} color="var(--primary)" />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Manage Staff</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Configure dept heads</div>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate(`/admin/settings${hQuery}`)}
                        className="btn-outline"
                        style={{ height: '72px', borderRadius: '1rem', borderStyle: 'dashed', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1.5rem' }}
                    >
                        <Settings size={20} color="var(--primary)" />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Hospital Settings</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Branding & Departments</div>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate(`/admin/feedbacks${hQuery}`)}
                        className="btn-outline"
                        style={{ height: '72px', borderRadius: '1rem', borderStyle: 'dashed', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1.5rem' }}
                    >
                        <BarChart3 size={20} color="var(--primary)" />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Deep Analysis</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Browse all feedback data</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
