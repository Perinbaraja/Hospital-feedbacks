import { useState, useEffect } from 'react';
import API, { BASE_ASSET_URL } from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, LogOut, Power, Settings, Users, MessageSquare, Plus, Trash2 } from 'lucide-react';

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

    const handleDeleteHospital = async (id, name) => {
        if (!window.confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY delete ${name}? This will remove all feedback records and staff accounts associated with this hospital. This action cannot be undone.`)) return;

        try {
            await API.delete(`/super-admin/hospitals/${id}`);
            toast.success(`${name} has been removed from the network`);
            fetchHospitals();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete hospital');
        }
    };

    // Removed handleCreateAdmin function as the Admin Creation modal is eliminated

    // Removed handleConfigureHospital function in favor of direct navigation

    return (
        <div style={{ padding: '1rem', position: 'relative' }}>
            {loading && (
                <div style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'white', padding: '8px 16px',
                    borderRadius: '2rem', border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 20
                }}>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#4338ca' }}></div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Syncing Network...</span>
                </div>
            )}
            <Toaster />

            {/* Header Section */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        🏥 Hospital Network
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>
                        System-wide orchestration and facility management.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/super-admin/add-hospital')}
                    style={{
                        padding: '12px 24px',
                        background: '#4338ca',
                        color: 'white',
                        borderRadius: '12px',
                        border: 'none',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)'
                    }}
                >
                    <Plus size={20} /> Enroll New Hospital
                </button>
            </div>


            {/* Hospital Table Container */}
            <div className="card" style={{ padding: '0', borderRadius: '1.25rem', border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Facility Info</th>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Unique ID</th>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Departments</th>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Total Feedback</th>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Status</th>
                            <th style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(hospitals) && hospitals.length > 0 ? (
                            hospitals.map((hosp) => (
                                <tr key={hosp._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '10px', background: '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0
                                            }}>
                                                {hosp.logoUrl ? (
                                                    <img src={hosp.logoUrl.startsWith('/') ? `${BASE_ASSET_URL}${hosp.logoUrl}` : hosp.logoUrl} alt="" style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }} />
                                                ) : (
                                                    <Building2 size={20} color="#64748b" />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '0.95rem' }}>{hosp.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{hosp.location || 'Location Not Set'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#4338ca', fontWeight: 600 }}>
                                            {hosp.uniqueId}
                                        </code>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <Users size={14} /> {hosp.departments?.length || 0}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <MessageSquare size={14} /> {hosp.feedbackCount || 0}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '2rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                background: hosp.isActive ? '#dcfce7' : '#fee2e2',
                                                color: hosp.isActive ? '#166534' : '#991b1b',
                                                letterSpacing: '0.03em'
                                            }}>
                                                {hosp.isActive ? 'Active' : 'Offline'}
                                            </span>
                                            <button
                                                onClick={() => handleToggleStatus(hosp._id, hosp.name, hosp.isActive)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', color: hosp.isActive ? '#ef4444' : '#22c55e',
                                                    display: 'flex', transition: 'transform 0.2s'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <Power size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => navigate(`/admin/settings?hospitalId=${hosp._id}`)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    background: '#f1f5f9',
                                                    border: '1px solid #e2e8f0',
                                                    color: '#475569',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={e => { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.color = 'white'; }}
                                                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                                            >
                                                <Settings size={14} /> Configure
                                            </button>
                                            <button
                                                onClick={() => handleDeleteHospital(hosp._id, hosp.name)}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    background: '#fee2e2',
                                                    border: '1px solid #fecaca',
                                                    color: '#991b1b',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Delete Hospital"
                                                onMouseOver={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                                                onMouseOut={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌐</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e1b4b' }}>No Hospitals Found</div>
                                    <p>Start by enrolling your first medical facility into the network.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>



            {/* Removed Admin Modal */}
        </div>
    );
};

export default SuperAdminDashboard;
