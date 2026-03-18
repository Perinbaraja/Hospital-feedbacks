import { useState, useEffect } from 'react';
import API, { BASE_ASSET_URL, getAssetUrl } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Power, Settings, Users, MessageSquare, Plus, Activity, Trash2, ShieldCheck, LayoutDashboard } from 'lucide-react';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const { data } = await API.get('/super-admin/hospitals');
            setHospitals(data);
        } catch {
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
        } catch {
            toast.error('Failed to update status');
        }
    };



    // Removed handleCreateAdmin function as the Admin Creation modal is eliminated

    const handleDeleteHospital = async (id, name) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to PERMANENTLY delete ${name}? This will remove all associated feedback and staff accounts. This action cannot be undone.`)) return;

        try {
            await API.delete(`/super-admin/hospitals/${id}`);
            toast.success(`${name} removed successfully`);
            fetchHospitals();
        } catch {
            toast.error('Failed to delete hospital');
        }
    };

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

            {/* Hospital Table View */}
            <div className="table-container" style={{ marginTop: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '2rem' }}>Hospital Facility</th>
                            <th>Unique ID</th>
                            <th>Location</th>
                            <th>Depts</th>
                            <th>Feedbacks</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                            <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(hospitals) && hospitals.length > 0 ? (
                            hospitals.map((hosp) => (
                                <tr key={hosp._id} className={hosp.isActive ? 'row-positive' : 'row-negative'}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px', background: '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9'
                                            }}>
                                                {hosp.logoUrl ? (
                                                    <img 
                                                        src={getAssetUrl(hosp.logoUrl)} 
                                                        alt="Logo" 
                                                        style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }} 
                                                    />
                                                ) : (
                                                    <Building2 size={24} color="#64748b" />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: '0.95rem' }}>{hosp.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Enrollment Active</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                            {hosp.uniqueId}
                                        </code>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                                            {hosp.location || 'N/A'}
                                            {hosp.district && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{hosp.district}</div>}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#475569' }}>
                                            <Activity size={14} color="#94a3b8" />
                                            {hosp.departments?.length || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#4338ca' }}>
                                            <MessageSquare size={14} color="#818cf8" />
                                            {hosp.feedbackCount || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            background: hosp.isActive ? '#dcfce7' : '#fee2e2',
                                            color: hosp.isActive ? '#166534' : '#991b1b',
                                            letterSpacing: '0.05em',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hosp.isActive ? '#166534' : '#991b1b' }}></span>
                                            {hosp.isActive ? 'Active' : 'Restricted'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                                            <button
                                                className="btn-outline"
                                                onClick={() => navigate(`/super-admin/hospital/${hosp._id}`)}
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px' }}
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(hosp._id, hosp.name, hosp.isActive)}
                                                style={{
                                                    width: '32px', height: '32px',
                                                    borderRadius: '8px',
                                                    background: hosp.isActive ? 'transparent' : '#22c55e',
                                                    color: hosp.isActive ? '#ef4444' : 'white',
                                                    border: hosp.isActive ? '1px solid #fca5a5' : 'none',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                title={hosp.isActive ? "Deactivate" : "Activate"}
                                            >
                                                <Power size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                                        <button
                                            onClick={() => handleDeleteHospital(hosp._id, hosp.name)}
                                            style={{
                                                width: '32px', height: '32px',
                                                borderRadius: '8px',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                border: '1px solid #fee2e2',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.background = '#fef2f2';
                                                e.currentTarget.style.borderColor = '#fca5a5';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.borderColor = '#fee2e2';
                                            }}
                                            title="Permanently Delete Hospital"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '5rem 0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🌐</div>
                                    <h3 style={{ color: '#1e1b4b', marginBottom: '0.5rem' }}>Network Empty</h3>
                                    <p style={{ color: '#64748b' }}>No hospital facilities have been registered in the system yet.</p>
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
