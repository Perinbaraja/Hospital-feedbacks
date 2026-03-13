import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, ShieldCheck, Settings, Activity, ExternalLink } from 'lucide-react';

const SuperAdminHospitalDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDetails = useCallback(async () => {
        try {
            const { data } = await API.get(`/super-admin/hospitals/${id}`);
            setHospital(data);
        } catch (error) {
            console.error('Failed to load details:', error);
            toast.error(error.response?.data?.message || 'Failed to load details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleToggleStatus = async () => {
        try {
            const { data } = await API.put(`/super-admin/hospitals/${id}/status`, { isActive: !hospital.isActive });
            setHospital(data);
            toast.success(`Hospital ${data.isActive ? 'Activated' : 'Deactivated'}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    if (!hospital && !loading) return <div className="card" style={{ padding: '4rem', textAlign: 'center' }}><h3>Hospital not found</h3><button className="btn-primary" onClick={() => navigate('/super-admin')} style={{ marginTop: '1rem' }}>Return to Network</button></div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            {loading && (
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'white', padding: '6px 14px',
                    borderRadius: '2rem', border: '1px solid #e2e8f0', zIndex: 20
                }}>
                    <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading details...</span>
                </div>
            )}
            {!hospital && loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <div className="spinner"></div>
                </div>
            ) : hospital && (
                <>
                    <Toaster />

                    {/* Breadcrumbs */}
                    <button
                        onClick={() => navigate('/super-admin')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600 }}
                    >
                        <ChevronLeft size={20} /> Back to Hospital Network
                    </button>

                    {/* Header Card */}
                    <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                                    🏥
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.5rem' }}>{hospital.name}</h1>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem' }}>{hospital.uniqueId}</code>
                                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                                        <span style={{ fontSize: '0.9rem', color: hospital.isActive ? '#166534' : '#991b1b', fontWeight: 700 }}>
                                            {hospital.isActive ? '• System Active' : '• Restricted Access'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 600 }}>System Status Control</p>
                                <button
                                    className={hospital.isActive ? "btn-outline" : "btn-primary"}
                                    style={{
                                        padding: '0.75rem 1.75rem',
                                        borderRadius: '12px',
                                        background: hospital.isActive ? 'rgba(239, 68, 68, 0.05)' : '#4338ca',
                                        color: hospital.isActive ? '#ef4444' : 'white',
                                        borderColor: hospital.isActive ? '#fca5a5' : 'transparent',
                                        fontWeight: 700
                                    }}
                                    onClick={handleToggleStatus}
                                >
                                    {hospital.isActive ? 'Deactivate Hospital' : 'Activate Hospital'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid for Actions and Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Facility Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.75rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={20} color="#4338ca" /> Facility Overview
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Contact Phone</p>
                                        <p style={{ fontWeight: 600, color: '#1e1b4b' }}>{hospital.phone || 'Not Set'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Primary Admin Email</p>
                                        <p style={{ fontWeight: 600, color: '#1e1b4b' }}>{hospital.adminEmail || 'Not Set'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Unique System ID</p>
                                        <p style={{ fontWeight: 600, color: '#4338ca' }}>{hospital.uniqueId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '1.75rem', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                                <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Quick Tip</h4>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
                                    Deactivating a hospital immediately blocks all of its staff (Admins and Dept Heads) from accessing their dashboard.
                                </p>
                            </div>
                        </div>

                        {/* Management Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.75rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Settings size={20} color="#4338ca" /> Management
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <button
                                        className="btn-outline"
                                        style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', borderRadius: '12px', fontSize: '0.95rem' }}
                                        onClick={() => navigate(`/admin/settings?hospitalId=${id}`)}
                                    >
                                        <ExternalLink size={18} style={{ marginRight: '10px' }} /> Branding & Config
                                    </button>
                                </div>
                            </div>
                            
                            <div className="card" style={{ padding: '1.75rem', background: '#eef2ff', border: '1px solid #e0e7ff', color: '#4338ca' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                                    <ShieldCheck size={20} />
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Role Isolation</h4>
                                </div>
                                <p style={{ fontSize: '0.8rem', lineHeight: '1.5', opacity: 0.9 }}>
                                    Staff management is isolated to the <strong>Hospital Admin Dashboard</strong> to ensure strict data privacy and regional administrative autonomy.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SuperAdminHospitalDetail;
