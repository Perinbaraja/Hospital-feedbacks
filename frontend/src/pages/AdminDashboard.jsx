import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { Activity, CheckCircle, Clock, TrendingUp, AlertCircle, BarChart3, Users, LayoutDashboard, Settings } from 'lucide-react';

const AdminDashboard = () => {
    const [searchParams] = useSearchParams();
    const hospitalId = searchParams.get('hospitalId');
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    const hQuery = hospitalId ? `?hospitalId=${hospitalId}` : '';

    const fetchData = async () => {
        try {
            const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
            const [statsRes, hospRes] = await Promise.all([
                API.get(`/feedback/stats${hIdParam}`),
                API.get(`/hospital${hIdParam}`)
            ]);
            setStats(statsRes.data);
            setHospital(hospRes.data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hospitalId]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
    );

    const StatCard = ({ title, value, color, icon: Icon, trend }) => (
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

    const positivePercent = stats?.total > 0 ? Math.round((stats.positiveCount / stats.total) * 100) : 0;

    return (
        <div style={{ padding: '2rem 0' }}>
            <div className="page-header" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="page-title text-colorful" style={{ fontSize: '2rem' }}>Performance Dashboard</h2>
                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Operational overview and real-time feedback orchestration.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={() => navigate(`/admin/feedbacks${hQuery}`)} style={{ background: 'var(--primary)', height: '48px', padding: '0 1.5rem', borderRadius: '12px' }}>
                        Live Feedback Table
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard
                    title="Total Encounters"
                    value={stats?.total || 0}
                    color="#6366f1"
                    icon={LayoutDashboard}
                />
                <StatCard
                    title="Pending Tasks"
                    value={stats?.pending || 0}
                    color="#f59e0b"
                    icon={Clock}
                />
                <StatCard
                    title="Resolved Issues"
                    value={stats?.completed || 0}
                    color="#10b981"
                    icon={CheckCircle}
                />
                <StatCard
                    title="Satisfaction Index"
                    value={`${positivePercent}%`}
                    color="#8b5cf6"
                    icon={TrendingUp}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Secondary: Service Matrix */}
                <div className="card" style={{ padding: '2rem', borderRadius: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Facility Service Matrix</h3>
                        <Activity size={20} color="#94a3b8" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {Object.entries(stats?.deptDistribution || {}).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No data available for departments.</p>
                        ) : (
                            Object.entries(stats.deptDistribution).sort((a, b) => b[1] - a[1]).map(([deptName, count]) => {
                                const percentage = Math.round((count / stats.total) * 100);
                                const deptObj = hospital?.departments?.find(d => d.name === deptName);
                                return (
                                    <div key={deptName}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {deptObj?.imageUrl ? (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        <img src={deptObj.imageUrl} alt="" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Activity size={16} color="#94a3b8" />
                                                    </div>
                                                )}
                                                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{deptName}</span>
                                            </div>
                                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>{count} feedback</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px' }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
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
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{stats?.positiveCount || 0}</p>
                            </div>
                            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Negative</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{stats?.negativeCount || 0}</p>
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
