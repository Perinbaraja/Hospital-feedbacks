import { useState } from 'react';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, Save, X, ShieldCheck, User, Mail, Phone, Lock, Smartphone, Eye, EyeOff } from 'lucide-react';

const SuperAdminAddHospital = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [newHospital, setNewHospital] = useState({
        name: '',
        location: '',
        phone: '', // Official Hospital Phone
        adminName: '', // Root Admin Full Name
        adminEmail: '', // Root Admin Email
        adminPassword: '', // Root Admin Initial Password
        adminPhone: '' // Root Admin Mobile (for SMS/Notifications)
    });

    const handleCreateHospital = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post('/super-admin/hospitals', newHospital);
            toast.success('Facility enrolled! Credentials sent to admin email.');
            setTimeout(() => {
                navigate('/super-admin');
            }, 1500);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to enroll facility');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '850px', margin: '0 auto', padding: '1rem' }}>
            <Toaster />

            {/* Professional Enrollment Header */}
            <div style={{ marginBottom: '3rem' }}>
                <button
                    onClick={() => navigate('/super-admin')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.9rem', fontWeight: 700, padding: '0',
                        marginBottom: '1.5rem', transition: 'all 0.2s'
                    }}
                >
                    <ChevronLeft size={18} /> Return to Network Overview
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '56px', height: '56px', background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                        borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)'
                    }}>
                        <Building2 size={28} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                            New Facility Enrollment
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: 500 }}>
                            Configure identity and root administrator for the new medical node.
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '0', border: '1px solid #e2e8f0', background: 'white', borderRadius: '2rem', overflow: 'hidden' }}>
                <form onSubmit={handleCreateHospital}>
                    <div style={{ padding: '3.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Section: Facility Profile */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#eef2ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={16} color="#4338ca" />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Facility Profile</h3>
                                </div>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Registered Hospital Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g. St. Mary's General Hospital"
                                    value={newHospital.name}
                                    onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                                    style={{ height: '52px', borderRadius: '12px', background: '#f8fafc' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>City / Location</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g. Pune, MH"
                                    value={newHospital.location}
                                    onChange={(e) => setNewHospital({ ...newHospital, location: e.target.value })}
                                    style={{ height: '52px', borderRadius: '12px', background: '#f8fafc' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Official Contact Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g. +91 22 2345 6789"
                                    value={newHospital.phone}
                                    onChange={(e) => setNewHospital({ ...newHospital, phone: e.target.value })}
                                    style={{ height: '52px', borderRadius: '12px', background: '#f8fafc' }}
                                />
                            </div>

                            {/* Section: Primary Admin */}
                            <div style={{ gridColumn: 'span 2', marginTop: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#fffbeb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={16} color="#d97706" />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Root Administrator Setup</h3>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                    These credentials will be securely sent to the admin's personal email for initial access.
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Admin Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '14px', top: '17px', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="e.g. Dr. John Doe"
                                        value={newHospital.adminName}
                                        onChange={(e) => setNewHospital({ ...newHospital, adminName: e.target.value })}
                                        style={{ height: '52px', borderRadius: '12px', paddingLeft: '42px', background: '#f8fafc' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Admin Mobile (for SMS)</label>
                                <div style={{ position: 'relative' }}>
                                    <Smartphone size={18} style={{ position: 'absolute', left: '14px', top: '17px', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="e.g. +91 98765 43210"
                                        value={newHospital.adminPhone}
                                        onChange={(e) => setNewHospital({ ...newHospital, adminPhone: e.target.value })}
                                        style={{ height: '52px', borderRadius: '12px', paddingLeft: '42px', background: '#f8fafc' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Login Email (Username)</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '17px', color: '#94a3b8' }} />
                                    <input
                                        type="email"
                                        className="form-control"
                                        required
                                        placeholder="admin@hosp.com"
                                        value={newHospital.adminEmail}
                                        onChange={(e) => setNewHospital({ ...newHospital, adminEmail: e.target.value })}
                                        style={{ height: '52px', borderRadius: '12px', paddingLeft: '42px', background: '#f8fafc' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700, color: '#475569' }}>Initial Password</label>
                                <div className="password-wrapper" style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '17px', color: '#94a3b8', zIndex: 1 }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        required
                                        placeholder="••••••••"
                                        value={newHospital.adminPassword}
                                        onChange={(e) => setNewHospital({ ...newHospital, adminPassword: e.target.value })}
                                        style={{ height: '52px', borderRadius: '12px', paddingLeft: '42px', background: '#f8fafc' }}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem', paddingTop: '2.5rem', borderTop: '2px dashed #f1f5f9' }}>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting}
                                style={{ flex: 2, background: '#4338ca', height: '60px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.4)' }}
                            >
                                <Save size={22} /> {submitting ? 'Enrolling facility...' : 'Launch Hospital System'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin')}
                                style={{ flex: 1, color: '#64748b', height: '60px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 600, border: '2px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                            >
                                Cancel Enrollment
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                <p><ShieldCheck size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#22c55e' }} /> ISO 27001 Validated Hospital Instance Provisioning</p>
            </div>
        </div>
    );
};

export default SuperAdminAddHospital;
