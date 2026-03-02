import { useState, useEffect } from 'react';
import API from '../api';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const [hospital, setHospital] = useState({ name: '', logoUrl: '', departments: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newDept, setNewDept] = useState('');

    const fetchConfig = async () => {
        try {
            const { data } = await API.get('/hospital');
            setHospital(data);
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put('/hospital', hospital);
            toast.success('Settings updated successfully');
        } catch (error) {
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddDept = () => {
        if (newDept.trim() && !hospital.departments.includes(newDept)) {
            setHospital({ ...hospital, departments: [...hospital.departments, newDept] });
            setNewDept('');
        }
    };

    const handleRemoveDept = (deptToRemove) => {
        setHospital({
            ...hospital,
            departments: hospital.departments.filter(d => d !== deptToRemove)
        });
    };

    if (loading) return <div>Loading Settings...</div>;

    const feedbackUrl = `${window.location.origin}/feedback/1`; // Using static ID for demo purposes

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

            {/* Settings Form */}
            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>Hospital Configuration</h2>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Hospital Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={hospital.name}
                            onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Logo URL</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="https://example.com/logo.png"
                            value={hospital.logoUrl}
                            onChange={(e) => setHospital({ ...hospital, logoUrl: e.target.value })}
                        />
                        {hospital.logoUrl && (
                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem', display: 'inline-block' }}>
                                <img src={hospital.logoUrl} alt="Preview" style={{ height: '50px', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Feedback Departments</label>
                        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
                            These departments will be listed dynamically on the public feedback form.
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="E.g. Security, Parking"
                                value={newDept}
                                onChange={(e) => setNewDept(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDept())}
                            />
                            <button type="button" onClick={handleAddDept} className="btn-outline" style={{ whiteSpace: 'nowrap' }}>
                                Add Dept
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {hospital.departments.map(dept => (
                                <div key={dept} style={{ backgroundColor: '#F3F4F6', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    {dept}
                                    <button type="button" onClick={() => handleRemoveDept(dept)} style={{ color: '#EF4444', fontWeight: 'bold' }}>&times;</button>
                                </div>
                            ))}
                            {hospital.departments.length === 0 && <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>No departments added.</span>}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>

            {/* QR Code Panel */}
            <div className="card" style={{ alignSelf: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Public Feedback Link</h3>

                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
                    <QRCode value={feedbackUrl} size={180} />
                </div>

                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem', wordBreak: 'break-all' }}>
                    {feedbackUrl}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(feedbackUrl);
                            toast.success('Link copied to clipboard!');
                        }}
                        className="btn-primary"
                        style={{ flex: 1, padding: '0.5rem' }}
                    >
                        Copy Link
                    </button>

                    <a href={feedbackUrl} target="_blank" rel="noreferrer" className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Open Form
                    </a>
                </div>
            </div>

        </div>
    );
};

export default AdminSettings;
