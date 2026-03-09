import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API, { BASE_ASSET_URL } from '../api';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LayoutGrid, Palette, ShieldCheck, QrCode, ClipboardCopy, ExternalLink, Plus } from 'lucide-react';

const AdminSettings = () => {
    const { login, updateUser } = useAuth();
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const hospitalId = queryParams.get('hospitalId');

    const [hospital, setHospital] = useState({
        name: '',
        logoUrl: '',
        departments: [],
        themeColor: '#0ca678',
        qrId: '1'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newDept, setNewDept] = useState({
        name: '',
        imageUrl: '',
        description: '',
        imageFile: null,
        positiveIssues: '',
        negativeIssues: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [adminProfile, setAdminProfile] = useState({ name: '', email: '', password: '' });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const fetchConfig = async (retryCount = 0) => {
        try {
            const url = hospitalId ? `/hospital?hospitalId=${hospitalId}` : '/hospital';
            const { data } = await API.get(url);
            if (data) {
                setHospital({
                    themeColor: '#0ca678',
                    qrId: '1',
                    ...data
                });
            } else {
                toast.error('Hospital configuration not found');
            }
            setLoading(false);
        } catch (error) {
            console.error('Settings fetch error:', error);
            if (retryCount < 2) {
                setTimeout(() => fetchConfig(retryCount + 1), 1500);
            } else {
                toast.error('Failed to load settings');
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchConfig();
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsed = JSON.parse(userInfo);
            setAdminProfile(prev => ({ ...prev, name: parsed.name, email: parsed.email }));
        }
    }, []);

    useEffect(() => {
        if (hospital.themeColor) {
            document.documentElement.style.setProperty('--primary', hospital.themeColor);
        }
    }, [hospital.themeColor]);

    const handleImageUpload = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const { data } = await API.post('/hospital/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return data.url;
        } catch (error) {
            toast.error('Image upload failed');
            return null;
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            let updatedHospital = { ...hospital };
            if (logoFile) {
                const url = await handleImageUpload(logoFile);
                if (url) updatedHospital.logoUrl = url;
            }
            const url = hospitalId ? `/hospital?hospitalId=${hospitalId}` : '/hospital';
            await API.put(url, updatedHospital);
            setHospital(updatedHospital);
            setLogoFile(null);
            toast.success('Settings updated successfully');
        } catch (error) {
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddDept = async () => {
        if (!newDept.name.trim()) return toast.error('Name is required');

        try {
            setSaving(true);
            let finalImageUrl = newDept.imageUrl;
            if (newDept.imageFile) {
                const url = await handleImageUpload(newDept.imageFile);
                if (url) finalImageUrl = url;
            }

            if (!hospital.departments.some(d => d.name === newDept.name)) {
                const updatedDepts = [...hospital.departments, {
                    name: newDept.name,
                    imageUrl: finalImageUrl,
                    description: newDept.description,
                    positiveIssues: newDept.positiveIssues.split(',').map(i => i.trim()).filter(i => i),
                    negativeIssues: newDept.negativeIssues.split(',').map(i => i.trim()).filter(i => i)
                }];
                setHospital({ ...hospital, departments: updatedDepts });
                setNewDept({ name: '', imageUrl: '', description: '', imageFile: null, positiveIssues: '', negativeIssues: '' });
                toast.success('Dept added. Click "Save Configuration" to apply changes.');
            } else {
                toast.error('Department already exists');
            }
        } catch (error) {
            toast.error('Failed to add department');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDept = (name) => {
        setHospital({
            ...hospital,
            departments: hospital.departments.filter(d => d.name !== name)
        });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const { data } = await API.put('/users/profile', adminProfile);
            updateUser(data);
            toast.success('Account updated successfully');
            setAdminProfile(prev => ({ ...prev, password: '' }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update account');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleGenerateNewQR = () => {
        const newId = Math.random().toString(36).substr(2, 8);
        setHospital({ ...hospital, qrId: newId });
        toast.success('New QR ID generated! Save to apply.');
    };

    const feedbackUrl = `${window.location.origin}/feedback/${hospital.qrId || '1'}`;

    return (
        <div style={{ position: 'relative' }}>
            {loading && (
                <div style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--surface)', padding: '6px 14px',
                    borderRadius: '2rem', border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)', zIndex: 20
                }}>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fetching config...</span>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h2 className="page-title">Hospital Configuration</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Customize your hospital profile, departments, feedback settings, and theme.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 1fr', gap: '2rem', alignItems: 'start' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Main Settings Card */}
                    <div className="card">
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <LayoutGrid size={20} color="var(--primary)" /> Global Identity
                                </h3>
                                <div className="form-group">
                                    <label className="form-label">Hospital Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter hospital name"
                                        value={hospital.name}
                                        onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="form-label">Brand Logo</label>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Brand Logo URL"
                                                value={hospital.logoUrl}
                                                onChange={(e) => setHospital({ ...hospital, logoUrl: e.target.value })}
                                                style={{ marginBottom: '0.75rem' }}
                                            />
                                            <input
                                                type="file"
                                                className="form-control"
                                                onChange={(e) => setLogoFile(e.target.files[0])}
                                                accept="image/*"
                                            />
                                        </div>
                                        {(hospital.logoUrl || logoFile) && (
                                            <div style={{
                                                width: '100px', height: '100px',
                                                border: '2px solid var(--border)', borderRadius: '1rem',
                                                overflow: 'hidden', background: '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem'
                                            }}>
                                                <img
                                                    src={logoFile ? URL.createObjectURL(logoFile) : (hospital.logoUrl.startsWith('/') ? `${BASE_ASSET_URL}${hospital.logoUrl}` : hospital.logoUrl)}
                                                    alt="Logo"
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Theme Color Section */}
                            <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Palette size={20} color="var(--primary)" /> Theme Color
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <input
                                        type="color"
                                        value={hospital.themeColor || '#0ca678'}
                                        onChange={(e) => setHospital({ ...hospital, themeColor: e.target.value })}
                                        style={{ width: '56px', height: '56px', borderRadius: '0.75rem', border: '2px solid var(--border)', cursor: 'pointer', padding: '4px', background: 'white' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={hospital.themeColor}
                                            onChange={(e) => setHospital({ ...hospital, themeColor: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['#0ca678', '#4F46E5', '#D946EF', '#06B6D4', '#EF4444'].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setHospital({ ...hospital, themeColor: c })}
                                                style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: hospital.themeColor === c ? '2px solid #000' : 'none', cursor: 'pointer' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Add Department Section */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Plus size={20} color="var(--primary)" /> Add Service Department
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 100px', gap: '1.5rem', alignItems: 'start' }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Department Name"
                                    value={newDept.name}
                                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input type="file" className="form-control" accept="image/*" onChange={(e) => setNewDept({ ...newDept, imageFile: e.target.files[0] })} />
                                    <input type="text" className="form-control" placeholder="Icon URL" value={newDept.imageUrl} onChange={(e) => setNewDept({ ...newDept, imageUrl: e.target.value })} />
                                </div>
                                <textarea
                                    className="form-control"
                                    placeholder="Short summary of services"
                                    value={newDept.description}
                                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <textarea className="form-control" placeholder="What went well? (Internal Note)" value={newDept.positiveIssues} onChange={(e) => setNewDept({ ...newDept, positiveIssues: e.target.value })} />
                                    <textarea className="form-control" placeholder="Need Improvements? (Internal Note)" value={newDept.negativeIssues} onChange={(e) => setNewDept({ ...newDept, negativeIssues: e.target.value })} />
                                </div>
                                <button type="button" onClick={handleAddDept} className="btn-primary" style={{ background: '#1e293b' }} disabled={saving}>
                                    + Add Department to Workflow
                                </button>
                            </div>
                            <div style={{ width: '100px', height: '100px', border: '2px dashed var(--border)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {(newDept.imageFile || newDept.imageUrl) ? (
                                    <img src={newDept.imageFile ? URL.createObjectURL(newDept.imageFile) : (newDept.imageUrl.startsWith('/') ? `${BASE_ASSET_URL}${newDept.imageUrl}` : newDept.imageUrl)} alt="Preview" style={{ maxWidth: '90%', maxHeight: '90%' }} />
                                ) : <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PREVIEW</span>}
                            </div>
                        </div>
                    </div>

                    {/* Active Departments Listing */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Active Departments</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {hospital?.departments?.map(dept => (
                                <div key={dept.name} className="card" style={{ padding: 0, position: 'relative', overflow: 'hidden', background: '#f8fafc', border: '1px solid var(--border)' }}>
                                    {dept.imageUrl && (
                                        <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderBottom: '1px solid var(--border)' }}>
                                            <img src={dept.imageUrl.startsWith('/') ? `${BASE_ASSET_URL}${dept.imageUrl}` : dept.imageUrl} alt="" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                                        </div>
                                    )}
                                    <div style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dept.name}</div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{dept.description}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDept(dept.name)}
                                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', border: '1px solid #fee2e2', borderRadius: '50%', color: '#ef4444', height: '28px', width: '28px', cursor: 'pointer' }}
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Final Save Configuration Button at the Bottom */}
                    <div className="card" style={{ border: '2px solid var(--primary)', background: 'var(--surface)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                            Ready to apply all changes? This includes hospital identity, theme colors, and the department list.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleSave()}
                            className="btn-primary"
                            disabled={saving}
                            style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', boxShadow: '0 4px 12px var(--shadow)' }}
                        >
                            {saving ? 'Applying Settings...' : '🚀 Finalize & Save Configuration'}
                        </button>
                    </div>
                </div>

                {/* Right Column Panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* QR Panel */}
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <QrCode size={20} color="var(--primary)" /> Public Access
                        </h3>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'inline-block', marginBottom: '1.5rem' }}>
                            <QRCode value={feedbackUrl} size={180} />
                        </div>
                        <div style={{ padding: '0.75rem', background: '#f1f5f9', borderRadius: '0.5rem', fontSize: '0.75rem', wordBreak: 'break-all', color: '#475569', marginBottom: '1rem' }}>{feedbackUrl}</div>

                        <button
                            type="button"
                            onClick={handleGenerateNewQR}
                            style={{
                                width: '100%',
                                marginBottom: '0.75rem',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '2px dashed #4F46E5',
                                color: '#4F46E5',
                                background: '#f5f3ff',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            🔄 Generate New QR ID
                        </button>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(feedbackUrl); toast.success('Link Copied!'); }} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ClipboardCopy size={16} /> Copy
                            </button>
                            <a href={feedbackUrl} target="_blank" rel="noreferrer" className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ExternalLink size={16} /> View
                            </a>
                        </div>

                    </div>

                    {/* Account Security */}
                    <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#92400e', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} /> Account Security
                        </h3>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Display Name</label>
                                <input type="text" className="form-control" style={{ background: 'white' }} value={adminProfile.name} onChange={e => setAdminProfile({ ...adminProfile, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Email Address</label>
                                <input type="email" className="form-control" style={{ background: 'white' }} value={adminProfile.email} onChange={e => setAdminProfile({ ...adminProfile, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>New Password</label>
                                <div className="password-wrapper">
                                    <input type={showPassword ? 'text' : 'password'} className="form-control" style={{ background: 'white' }} placeholder="Leave blank to keep same" value={adminProfile.password} onChange={e => setAdminProfile({ ...adminProfile, password: e.target.value })} />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ background: '#d97706' }} disabled={updatingProfile}>
                                {updatingProfile ? 'Updating...' : 'Update Credentials'}
                            </button>
                        </form>
                    </div>

                </div>

            </div >
        </div >
    );
};

export default AdminSettings;
