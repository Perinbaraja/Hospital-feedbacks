import { useState, useEffect } from 'react';
import API from '../api';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const hospitalId = queryParams.get('hospitalId');

    const [hospital, setHospital] = useState({ name: '', logoUrl: '', departments: [], themeColor: '#0ca678', qrId: '1' });
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

    const fetchConfig = async () => {
        try {
            const url = hospitalId ? `/hospital?hospitalId=${hospitalId}` : '/hospital';
            const { data } = await API.get(url);
            setHospital({
                themeColor: '#0ca678',
                qrId: '1',
                ...data
            });
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        // Load initial admin profile from storage/context
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsed = JSON.parse(userInfo);
            setAdminProfile(prev => ({ ...prev, name: parsed.name, email: parsed.email }));
        }
    }, []);

    // Live preview: update CSS variable when admin changes colour
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
        e.preventDefault();
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
        } else {
            toast.error('Department already exists');
        }
        setSaving(false);
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
            // Update local storage to reflect changes
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, ...data }));
            toast.success('Account updated. Please note your new credentials.');
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
        toast.success('New QR ID generated! Save settings to keep it.');
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Settings...</div>;

    const feedbackUrl = `${window.location.origin}/feedback/${hospital.qrId || '1'}`;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Hospital Configuration</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Customize your hospital profile, departments, feedback settings, and theme.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* ── Settings Form ── */}
                <div className="card">
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Global Identity */}
                        <div>
                            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Global Identity</h3>

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
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Brand Logo URL"
                                            value={hospital.logoUrl}
                                            onChange={(e) => setHospital({ ...hospital, logoUrl: e.target.value })}
                                            style={{ marginBottom: '0.75rem' }}
                                        />
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="file"
                                                className="form-control"
                                                onChange={(e) => setLogoFile(e.target.files[0])}
                                                accept="image/*"
                                                id="logo-upload"
                                                style={{ paddingLeft: '2.5rem' }}
                                            />
                                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>📁</span>
                                        </div>
                                    </div>
                                    {(hospital.logoUrl || logoFile) && (
                                        <div style={{
                                            width: '100px', height: '100px',
                                            border: '2px solid var(--border)', borderRadius: '1rem',
                                            overflow: 'hidden', background: '#f8fafc',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem'
                                        }}>
                                            <img
                                                src={logoFile ? URL.createObjectURL(logoFile) : (hospital.logoUrl.startsWith('/') ? `http://localhost:5000${hospital.logoUrl}` : hospital.logoUrl)}
                                                alt="Logo"
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Theme Color ── */}
                        <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>🎨 Theme Color</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Choose a brand color. This updates the form, buttons, and dashboard accents instantly.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <input
                                    type="color"
                                    value={hospital.themeColor || '#0ca678'}
                                    onChange={(e) => setHospital({ ...hospital, themeColor: e.target.value })}
                                    style={{
                                        width: '56px', height: '56px',
                                        borderRadius: '0.75rem', border: '2px solid var(--border)',
                                        cursor: 'pointer', padding: '4px', background: 'white'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="#0ca678"
                                        value={hospital.themeColor || '#0ca678'}
                                        onChange={(e) => setHospital({ ...hospital, themeColor: e.target.value })}
                                    />
                                </div>
                                {/* Preset swatches */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {['#0ca678', '#4F46E5', '#D946EF', '#06B6D4', '#F59E0B', '#EF4444', '#22C55E'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            title={c}
                                            onClick={() => setHospital({ ...hospital, themeColor: c })}
                                            style={{
                                                width: '28px', height: '28px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: hospital.themeColor === c ? '2px solid #000' : '2px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s'
                                            }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setHospital({ ...hospital, themeColor: '#0ca678' })}
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            background: 'white'
                                        }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Add Department ── */}
                        <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add Service Department</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 100px', gap: '1.5rem', alignItems: 'start' }}>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Department Name (e.g. Inpatient, Pharmacy)"
                                        value={newDept.name}
                                        onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Icon URL (optional)"
                                            value={newDept.imageUrl}
                                            onChange={(e) => setNewDept({ ...newDept, imageUrl: e.target.value })}
                                        />
                                        <input
                                            type="file"
                                            className="form-control"
                                            accept="image/*"
                                            onChange={(e) => setNewDept({ ...newDept, imageFile: e.target.files[0] })}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Short summary of services"
                                        value={newDept.description}
                                        onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <textarea
                                            className="form-control"
                                            style={{ minHeight: '80px', fontSize: '0.8rem' }}
                                            placeholder="What went well? (comma separated)"
                                            value={newDept.positiveIssues}
                                            onChange={(e) => setNewDept({ ...newDept, positiveIssues: e.target.value })}
                                        />
                                        <textarea
                                            className="form-control"
                                            style={{ minHeight: '80px', fontSize: '0.8rem' }}
                                            placeholder="Need Improvements? (comma separated)"
                                            value={newDept.negativeIssues}
                                            onChange={(e) => setNewDept({ ...newDept, negativeIssues: e.target.value })}
                                        />
                                    </div>
                                    <button type="button" onClick={handleAddDept} className="btn-primary" disabled={saving}>
                                        {saving ? 'Adding...' : '+ Add Department'}
                                    </button>
                                </div>

                                {/* Preview Box */}
                                <div style={{
                                    width: '100px', height: '100px',
                                    border: '2px dashed var(--border)', borderRadius: '0.75rem',
                                    background: 'var(--surface)', display: 'flex',
                                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: '0.5rem', overflow: 'hidden'
                                }}>
                                    {(newDept.imageFile || newDept.imageUrl) ? (
                                        <img
                                            src={newDept.imageFile ? URL.createObjectURL(newDept.imageFile) : (newDept.imageUrl.startsWith('/') ? `http://localhost:5000${newDept.imageUrl}` : newDept.imageUrl)}
                                            alt="Preview"
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>Icon Preview</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Active Departments ── */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Active Departments</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                {hospital.departments.map(dept => (
                                    <div key={dept.name} className="card" style={{
                                        padding: 0, position: 'relative', overflow: 'hidden',
                                        background: 'var(--surface)', border: '1px solid var(--border)'
                                    }}>
                                        {dept.imageUrl && (
                                            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderBottom: '1px solid var(--border)', padding: '0.75rem' }}>
                                                <img
                                                    src={dept.imageUrl.startsWith('/') ? `http://localhost:5000${dept.imageUrl}` : dept.imageUrl}
                                                    alt=""
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{dept.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', height: '2.4em', overflow: 'hidden' }}>{dept.description}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDept(dept.name)}
                                            style={{
                                                position: 'absolute', top: '8px', right: '8px',
                                                backgroundColor: 'rgba(255,255,255,0.9)',
                                                border: '1px solid var(--border)', borderRadius: '50%',
                                                width: '28px', height: '28px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--danger)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                cursor: 'pointer', zIndex: 10
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '2px solid var(--background)', paddingTop: '2rem' }}>
                            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }}>
                                {saving ? 'Applying Settings...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── QR Code Panel ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>QR Code &amp; Access</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Patients scan this to access the feedback form instantly.
                        </p>

                        {/* QR Code */}
                        <div style={{
                            background: 'white', padding: '1.5rem', borderRadius: '1.25rem',
                            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem'
                        }}>
                            <QRCode value={feedbackUrl} size={200} fgColor="#000000" />
                        </div>

                        {/* URL display */}
                        <div style={{
                            background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                            border: '1px solid var(--border)', width: '100%', marginBottom: '1rem',
                            fontSize: '0.8rem', color: 'var(--primary-dark)', fontFamily: 'monospace', wordBreak: 'break-all'
                        }}>
                            {feedbackUrl}
                        </div>

                        {/* Account Security (New Section) */}
                        <div className="card" style={{ width: '100%', borderLeft: '4px solid #f59e0b', background: '#fffbeb', marginBottom: '1.5rem', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', color: '#92400e', marginBottom: '1rem' }}>🔐 Account Security</h3>
                            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Display Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ background: 'white' }}
                                        value={adminProfile.name}
                                        onChange={e => setAdminProfile({ ...adminProfile, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Email Address</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        style={{ background: 'white' }}
                                        value={adminProfile.email}
                                        onChange={e => setAdminProfile({ ...adminProfile, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>New Password (Leave blank to keep same)</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        style={{ background: 'white' }}
                                        placeholder="••••••••"
                                        value={adminProfile.password}
                                        onChange={e => setAdminProfile({ ...adminProfile, password: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: '#d97706', width: '100%', padding: '0.75rem' }} disabled={updatingProfile}>
                                    {updatingProfile ? 'Updating...' : 'Update Credentials'}
                                </button>
                            </form>
                        </div>

                        {/* QR ID section */}
                        <div style={{ width: '100%', marginBottom: '1rem' }}>
                            <label className="form-label" style={{ textAlign: 'left', display: 'block', marginBottom: '0.4rem' }}>QR Code ID</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. 1, ward-a, lobby"
                                    value={hospital.qrId || ''}
                                    onChange={(e) => setHospital({ ...hospital, qrId: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={handleGenerateNewQR}
                                    title="Generate a new random QR ID"
                                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    🔄 New QR
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'left' }}>
                                If the current QR isn't working, click "New QR" to generate a fresh link, then save.
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(feedbackUrl);
                                    toast.success('Link copied to clipboard!');
                                }}
                                className="btn-primary"
                                style={{ flex: 1 }}
                            >
                                Copy URL
                            </button>
                            <a
                                href={feedbackUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-outline"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                View Form
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSettings;
