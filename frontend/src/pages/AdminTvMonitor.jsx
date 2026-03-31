import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Monitor, ExternalLink, QrCode as QrIcon, Copy } from 'lucide-react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getHospitalConfig, setHospitalConfigCache } from '../services/hospitalConfig';

const AdminTvMonitor = () => {
    const { user } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const hospitalId = params.get('hospitalId');
    
    // Fallback to user's hospital if not in URL (Standard Admin case)
    const effectiveHospitalId = hospitalId || user?.hospital?._id || user?.hospital;
    const hQuery = effectiveHospitalId ? `?hospitalId=${effectiveHospitalId}` : '';
    
    const [hospital, setHospital] = useState(null);
    const [tvUrl, setTvUrl] = useState('');
    const [tvFilters, setTvFilters] = useState({
        departments: [],
        type: '',
        status: 'IN PROGRESS',
        visibleColumns: ['sno', 'department', 'feedbackType', 'comment', 'date', 'time', 'status']
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                if (!effectiveHospitalId) return;

                const query = `?hospitalId=${effectiveHospitalId}`;
                const [hRes, dRes] = await Promise.all([
                    getHospitalConfig({ hospitalId: effectiveHospitalId }),
                    API.get(`/departments${query}`)
                ]);
                
                const data = hRes;
                const depts = dRes.data || [];
                
                setHospital({
                    ...data,
                    departments: depts
                });

                // Construct more readable URL if uniqueId is available
                const baseUrl = window.location.origin;
                const hIdForUrl = data.uniqueId || effectiveHospitalId;
                setTvUrl(`${baseUrl}/tv-dashboard?hospitalId=${hIdForUrl}`);

                if (data.tvFilters) {
                    setTvFilters(prev => ({
                        ...prev,
                        ...data.tvFilters,
                        departments: (data.tvFilters.departments || []).filter(d => depts.some(existDept => existDept.name === d)),
                        visibleColumns: data.tvFilters.visibleColumns || ['sno', 'department', 'feedbackType', 'comment', 'date', 'time', 'status']
                    }));
                }
            } catch (error) {
                console.error('Failed to load hospital data', error);
            }
        };
        fetchHospital();
        
        // Initial construction
        const baseUrl = window.location.origin;
        if (effectiveHospitalId) {
            setTvUrl(`${baseUrl}/tv-dashboard?hospitalId=${effectiveHospitalId}`);
        }
    }, [effectiveHospitalId]);

    const handleApplyFilters = async () => {
        setIsSaving(true);
        try {
            const query = effectiveHospitalId ? `?hospitalId=${effectiveHospitalId}` : '';
            const { data } = await API.put(`/hospital/tv-filters${query}`, tvFilters);
            if (hospital) {
                setHospitalConfigCache({
                    ...hospital,
                    tvFilters: data
                });
            }
            toast.success('TV dashboard filters applied successfully');
        } catch (error) {
            console.error('Failed to apply filters', error);
            toast.error('Failed to apply filters');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTvFilters(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleDeptToggle = (deptName) => {
        setTvFilters(prev => {
            const depts = [...prev.departments];
            if (depts.includes(deptName)) {
                return { ...prev, departments: depts.filter(d => d !== deptName) };
            } else {
                return { ...prev, departments: [...depts, deptName] };
            }
        });
    };
    const handleColumnToggle = (colId) => {
        setTvFilters(prev => {
            const cols = [...(prev.visibleColumns || [])];
            if (cols.includes(colId)) {
                return { ...prev, visibleColumns: cols.filter(c => c !== colId) };
            } else {
                return { ...prev, visibleColumns: [...cols, colId] };
            }
        });
    };
    const handleOpenTv = () => {
        window.open(tvUrl, '_blank');
        toast.success('TV Dashboard launched in new tab');
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(tvUrl);
        toast.success('TV dashboard link copied successfully.');
    };

    return (
        <div className="admin-tv-monitor">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 className="page-title text-colorful">TV Monitor Control</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Configure filters and launch the hospital feedback display screen.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status: Ready</span>
                </div>
            </div>

            {/* Section 1: Filters and Display Controls */}
            <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>TV Dashboard Filters and Display Controls</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Control exactly which feedback records and columns appear on the TV screen. 
                    </p>
                </div>

                <div className="filters-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '2.5rem',
                    marginBottom: '2rem'
                }}>
                    {/* Left Column: Column Display Settings & Department Filters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="filter-group">
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                TV Dashboard Column Display Settings
                            </label>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                                gap: '1rem',
                                background: '#f8fafc',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {[
                                    { id: 'sno', label: 'Serial Number (S.No)' },
                                    { id: 'feedbackId', label: 'Feedback ID' },
                                    { id: 'department', label: 'Department' },
                                    { id: 'feedbackType', label: 'Feedback Type' },
                                    { id: 'comment', label: 'Comment' },
                                    { id: 'date', label: 'Date Submitted' },
                                    { id: 'time', label: 'Time Submitted' },
                                    { id: 'status', label: 'Status' }
                                ].map(col => (
                                    <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 0' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={tvFilters.visibleColumns?.includes(col.id)}
                                            onChange={() => handleColumnToggle(col.id)}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                        />
                                        {col.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group">
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                Department Filters
                            </label>
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: '0.5rem',
                                background: 'white',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                maxHeight: '250px',
                                overflowY: 'auto'
                            }}>
                                {hospital?.departments?.map(dept => (
                                    <label key={dept.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '1rem', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={tvFilters.departments.includes(dept.name)}
                                            onChange={() => handleDeptToggle(dept.name)}
                                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                                        />
                                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{dept.name}</span>
                                    </label>
                                ))}
                                {(!hospital?.departments || hospital.departments.length === 0) && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No departments found</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Other Filters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            Advanced Record Filtering
                        </label>
                        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="filter-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Feedback Type</label>
                                <select 
                                    name="type"
                                    value={tvFilters.type}
                                    onChange={handleFilterChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="Positive">Positive</option>
                                    <option value="Negative">Negative</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Status</label>
                                <select 
                                    name="status"
                                    value={tvFilters.status}
                                    onChange={handleFilterChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                >
                                    <option value="IN PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed/Resolved</option>
                                </select>
                            </div>
                        </div>




                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        className="btn-primary" 
                        onClick={handleApplyFilters} 
                        disabled={isSaving}
                        style={{ padding: '0.875rem 2.5rem', minWidth: '180px' }}
                    >
                        {isSaving ? 'Applying...' : 'Apply Filters'}
                    </button>
                </div>
            </div>

            {/* Section 2: TV Dashboard Access (Link + QR) */}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', marginTop: '2rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <div>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '16px', 
                            background: 'rgba(12, 166, 120, 0.1)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            marginBottom: '1.5rem'
                        }}>
                            <Monitor size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>TV Dashboard Link</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Share this link to display live feedback on hospital monitors and TVs. No login is required to view this dashboard.
                        </p>
                        
                        <div style={{ 
                            background: '#f8fafc', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}>
                            <code style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-all' }}>
                                {tvUrl}
                            </code>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={handleOpenTv} style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ExternalLink size={18} /> Open TV Dashboard
                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={handleCopyLink}
                                style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 600
                                }}
                            >
                                <Copy size={18} /> Copy TV Dashboard Link
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid var(--vibrant-violet)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--vibrant-violet)' }}>
                        <QrIcon size={20} />
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>QR Code Login</h3>
                    </div>
                    <div style={{ 
                        background: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '1rem', 
                        border: '1px solid #e2e8f0', 
                        display: 'inline-block',
                        marginBottom: '1.5rem'
                    }}>
                        <QRCode 
                            value={tvUrl} 
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Scan this code with a smart TV or tablet to open the dashboard directly.
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid var(--accent)' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 TV Setup Tips
                </h4>
                <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '1.25rem' }}>
                    <li>Use a <b>dedicated PC or Chromebox</b> connected to your TV via HDMI.</li>
                    <li>Ensure the device has a <b>stable internet connection</b>.</li>
                    <li>Press <b>F11</b> on your keyboard to enter full-screen mode in the browser.</li>
                    <li>The display will <b>automatically update every 10 seconds</b> when new feedback arrives.</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminTvMonitor;
