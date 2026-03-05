import { useState, useEffect } from 'react';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, ShieldCheck, LogOut, Power, Settings, Activity, Users, MessageSquare } from 'lucide-react';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHospital, setSelectedHospital] = useState(null);

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const { data } = await API.get('/super-admin/hospitals');
            setHospitals(data);
        } catch (error) {
            toast.error('Failed to fetch hospitals');
        } finally {
            setLoading(false);
        }
    };


    const handleToggleStatus = async (id, name, currentStatus) => {
        const action = currentStatus ? 'Disable' : 'Activate';
        if (!window.confirm(`Are you sure you want to ${action} ${name}?`)) return;

        try {
            await API.put(`/super-admin/hospitals/${id}/status`, { isActive: !currentStatus });
            toast.success(`${name} ${action}d successfully`);
            fetchHospitals();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    // Removed handleCreateAdmin function as the Admin Creation modal is eliminated

    // Removed handleConfigureHospital function in favor of direct navigation

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="spinner"></div>
            <p style={{ marginLeft: '1rem', color: '#64748b', fontWeight: 600 }}>Syncing Network Data...</p>
        </div>
    );

    return (
        <div style={{ padding: '1rem' }}>
            <Toaster />

            {/* Header Section */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    🏥 Hospital Network
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>
                    Manage and monitor medical facilities across your infrastructure.
                </p>
            </div>

            {/* Global Summary Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #4338ca', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '12px' }}>
                        <Building2 size={24} color="#4338ca" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Facilities</p>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{hospitals.length}</h4>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #22c55e', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '12px' }}>
                        <Activity size={24} color="#22c55e" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Nodes</p>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{hospitals.filter(h => h.isActive).length}</h4>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                        <ShieldCheck size={24} color="#ef4444" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Maintenance Required</p>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{hospitals.filter(h => !h.isActive).length}</h4>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px' }}>
                        <MessageSquare size={24} color="#f59e0b" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Feedbacks</p>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{hospitals.reduce((acc, h) => acc + (h.feedbackCount || 0), 0)}</h4>
                    </div>
                </div>
            </div>

            {/* Hospital Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                {Array.isArray(hospitals) && hospitals.length > 0 ? (
                    hospitals.map((hosp) => (
                        <div key={hosp._id} className="card-hover" style={{
                            background: 'white',
                            padding: '1.75rem',
                            borderRadius: '1.25rem',
                            border: `2px solid ${hosp.isActive ? '#e2e8f0' : '#fee2e2'}`,
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            cursor: 'default',
                            overflow: 'hidden',
                            boxShadow: hosp.isActive ? 'none' : 'inset 0 0 40px rgba(239, 68, 68, 0.05)'
                        }} >
                            {/* Status Label & Power Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '16px', background: '#f8fafc',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0'
                                }}>
                                    {hosp.logoUrl ? (
                                        <img src={hosp.logoUrl.startsWith('/') ? `http://localhost:5000${hosp.logoUrl}` : hosp.logoUrl} alt="Logo" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                                    ) : (
                                        <Building2 size={32} color="#64748b" />
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: hosp.isActive ? '#dcfce7' : '#fee2e2',
                                        color: hosp.isActive ? '#166534' : '#991b1b',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {hosp.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(hosp._id, hosp.name, hosp.isActive); }}
                                        title={hosp.isActive ? "Deactivate Hospital" : "Activate Hospital"}
                                        style={{
                                            width: '36px', height: '36px',
                                            borderRadius: '50%',
                                            background: hosp.isActive ? '#ef4444' : '#22c55e',
                                            color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            border: 'none',
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Power size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.5rem' }}>{hosp.name}</h3>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={14} color="#64748b" />
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{hosp.departments?.length || 0} Depts</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MessageSquare size={14} color="#64748b" />
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{hosp.feedbackCount || 0} Feedbacks</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                                <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                                    ID: {hosp.uniqueId}
                                </code>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button
                                    className="btn-primary"
                                    style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700, height: '48px', borderRadius: '12px', background: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/settings?hospitalId=${hosp._id}`); }}
                                >
                                    <Settings size={18} /> Configuration Settings
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
                        <h3 style={{ color: '#1e1b4b' }}>No Hospitals Registered</h3>
                        <p style={{ color: '#64748b' }}>Click "+ Add New Hospital" to begin expanding the network.</p>
                    </div>
                )}
            </div>


            {/* Removed Admin Modal */}
        </div>
    );
};

export default SuperAdminDashboard;
