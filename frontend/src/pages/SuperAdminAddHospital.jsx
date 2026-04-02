import { useState } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, Save, X, ShieldCheck, User, Mail, Phone, Lock, Smartphone, Eye, EyeOff } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const SuperAdminAddHospital = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile(768);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [newHospital, setNewHospital] = useState({
        name: '',
        phone: '', // Official Hospital Phone
        adminName: '', // Root Admin Full Name
        adminEmail: '', // Root Admin Email
        adminPassword: '', // Root Admin Initial Password
        adminPhone: '', // Root Admin Mobile (for SMS/Notifications)
        location: '',
        district: '',
        state: ''
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

            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <button
                    onClick={() => navigate('/super-admin')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.9rem', fontWeight: 700, padding: '0',
                        marginBottom: '1.5rem'
                    }}
                >
                    <ChevronLeft size={18} /> Return to Dashboard
                </button>
                <div className="responsive-content-row" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '56px', height: '56px', background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                        borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Building2 size={28} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '4px' }}>
                            Add New Hospital
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.05rem' }}>
                            Register a new facility and provision its administrative access.
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '0', border: '1px solid #e2e8f0', background: 'white', borderRadius: '1.5rem', overflow: 'hidden' }}>
                <form onSubmit={handleCreateHospital} autoComplete="off">
                    <div style={{ padding: isMobile ? '1.25rem' : '3rem' }}>
                        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '1.5rem' }}>Facility Details</h3>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label" style={{ fontWeight: 700 }}>Hospital Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="Enter hospital name"
                                    value={newHospital.name}
                                    onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                                />
                            </div>



                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>Location / Street</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. MG Road, Civil Lines"
                                    value={newHospital.location}
                                    onChange={(e) => setNewHospital({ ...newHospital, location: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>City</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Mumbai"
                                    value={newHospital.district}
                                    onChange={(e) => setNewHospital({ ...newHospital, district: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>State</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Maharashtra"
                                    value={newHospital.state}
                                    onChange={(e) => setNewHospital({ ...newHospital, state: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>Hospital Phone</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    maxLength={10}
                                    pattern="\d{10}"
                                    placeholder="Official contact number"
                                    value={newHospital.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) setNewHospital({ ...newHospital, phone: val });
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.5rem' }}>Hospital Admin Credentials</h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                    An automated email will be sent to this email address containing the temporary password.
                                </p>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label" style={{ fontWeight: 700 }}>Hospital Admin Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    required
                                    autoComplete="none"
                                    placeholder="admin@hospital.com"
                                    value={newHospital.adminEmail}
                                    onChange={(e) => setNewHospital({ ...newHospital, adminEmail: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>Temporary Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        minLength={6}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Minimum 6 characters"
                                        value={newHospital.adminPassword}
                                        onChange={(e) => setNewHospital({ ...newHospital, adminPassword: e.target.value })}
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

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 700 }}>Admin Full Name (Internal)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Dr. Jane Smith"
                                    value={newHospital.adminName}
                                    onChange={(e) => setNewHospital({ ...newHospital, adminName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting}
                                style={{ flex: 1, padding: '1rem', background: '#4338ca' }}
                            >
                                {submitting ? 'Creating Hospital...' : 'Add Hospital'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin')}
                                className="btn-outline"
                                style={{ flex: 1, padding: '1rem' }}
                            >
                                Cancel
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
