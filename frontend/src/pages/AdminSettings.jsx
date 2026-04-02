import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API, { BASE_ASSET_URL, getAssetUrl, API_BASE_URL } from '../api';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LayoutGrid, Palette, ShieldCheck, QrCode, ClipboardCopy, ExternalLink, Plus, Trash2, Edit, ImageOff, Upload } from 'lucide-react';
import { getHospitalConfig, setHospitalConfigCache } from '../services/hospitalConfig';
import useIsMobile from '../hooks/useIsMobile';

const createEmptyFeedbackField = (type = 'positive') => ({
    type,
    label: '',
    emailEnabled: false,
    recipientName: '',
    recipientEmail: ''
});

const DEFAULT_DEPARTMENT_FEEDBACK_FIELDS = {
    canteen: {
        positive: ['Tasty Food', 'Clean Area', 'Friendly Staff'],
        negative: ['Food Quality', 'Slow Service', 'High Price']
    },
    doctor: {
        positive: ['Professional Care', 'Clear Explanation', 'Polite Behaviour'],
        negative: ['Long Wait Time', 'Rude Behaviour', 'Lack of Information']
    },
    medicine: {
        positive: ['Medicine Available', 'Quick Delivery', 'Helpful Staff'],
        negative: ['Medicine Out of Stock', 'Long Queue', 'Wrong Medicine Given']
    },
    parking: {
        positive: ['Parking Available', 'Safe Parking', 'Easy Access'],
        negative: ['No Space Available', 'High Parking Fee', 'Poor Management']
    }
};

const DEFAULT_DEPARTMENT_ALIASES = {
    medicines: 'medicine',
    doctors: 'doctor',
    pharmacy: 'medicine'
};

const getDefaultDepartmentFeedbackConfigs = (departmentName = '') => {
    const normalizedName = String(departmentName || '').trim().toLowerCase();
    const resolvedName = DEFAULT_DEPARTMENT_ALIASES[normalizedName] || normalizedName;
    const defaults = DEFAULT_DEPARTMENT_FEEDBACK_FIELDS[resolvedName];
    if (!defaults) return [];

    return [
        ...defaults.positive.map((label) => ({ ...createEmptyFeedbackField('positive'), label })),
        ...defaults.negative.map((label) => ({ ...createEmptyFeedbackField('negative'), label }))
    ];
};

const hasMeaningfulFeedbackConfigs = (feedbackConfigs = []) => (
    Array.isArray(feedbackConfigs)
    && feedbackConfigs.some((config) => (
        String(config?.label || '').trim()
        || config?.emailEnabled
        || String(config?.recipientName || '').trim()
        || String(config?.recipientEmail || '').trim()
    ))
);

const normalizeFeedbackConfigsForForm = (feedbackConfigs = [], fallbackPositive = '', fallbackNegative = '', departmentName = '') => {
    if (Array.isArray(feedbackConfigs) && feedbackConfigs.length > 0) {
        return feedbackConfigs.map((config) => ({
            type: config?.type === 'negative' ? 'negative' : 'positive',
            label: config?.label || '',
            emailEnabled: Boolean(config?.emailEnabled),
            recipientName: config?.recipientName || '',
            recipientEmail: config?.recipientEmail || ''
        }));
    }

    const positives = String(fallbackPositive || '').split(';').map((item) => item.trim()).filter(Boolean);
    const negatives = String(fallbackNegative || '').split(';').map((item) => item.trim()).filter(Boolean);

    const fallbackConfigs = [
        ...positives.map((label) => ({ ...createEmptyFeedbackField('positive'), label })),
        ...negatives.map((label) => ({ ...createEmptyFeedbackField('negative'), label }))
    ];

    if (fallbackConfigs.length > 0) {
        return fallbackConfigs;
    }

    return getDefaultDepartmentFeedbackConfigs(departmentName);
};

const hydrateDepartmentFeedbackConfigs = (department = {}) => {
    const normalizedConfigs = normalizeFeedbackConfigsForForm(
        department.feedbackConfigs,
        department.positive_feedback || (department.positiveIssues || []).join('; '),
        department.negative_feedback || (department.negativeIssues || []).join('; '),
        department.name
    );

    const positiveLabels = normalizedConfigs
        .filter((config) => config.type === 'positive')
        .map((config) => config.label)
        .filter(Boolean);

    const negativeLabels = normalizedConfigs
        .filter((config) => config.type === 'negative')
        .map((config) => config.label)
        .filter(Boolean);

    return {
        ...department,
        feedbackConfigs: normalizedConfigs,
        positive_feedback: positiveLabels.join('; '),
        negative_feedback: negativeLabels.join('; '),
        positiveIssues: positiveLabels,
        negativeIssues: negativeLabels
    };
};

const buildFeedbackConfigPayload = (feedbackConfigs = []) => {
    return feedbackConfigs.map((config) => ({
        type: config.type === 'negative' ? 'negative' : 'positive',
        label: (config.label || '').trim(),
        emailEnabled: Boolean(config.emailEnabled),
        recipientName: config.emailEnabled ? (config.recipientName || '').trim() : '',
        recipientEmail: config.emailEnabled ? (config.recipientEmail || '').trim() : ''
    })).filter((config) => config.label);
};

const slugifyQrSegment = (value = '') => (
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
);

const buildPublicFeedbackIdentifier = (hospital = {}) => {
    const hospitalKey = String(hospital.hospitalId || hospital._id || hospital.uniqueId || '').trim();
    const locationKey = slugifyQrSegment(hospital.location) || 'general';
    const qrKey = String(hospital.uniqueId || hospital.qrId || '').trim();

    return [hospitalKey, locationKey, qrKey].filter(Boolean).join('--');
};


const AdminSettings = () => {
    const { user, updateUser } = useAuth();
    const isMobile = useIsMobile(768);
    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const queryHospitalId = queryParams.get('hospitalId');
    const hospitalId = queryHospitalId || user?.hospitalId || user?.hospital?._id || '';

    const [hospital, setHospital] = useState({
        name: '',
        logoUrl: '',
        feedbackBgUrl: '',
        departments: [],
        themeColor: '#0ca678',
        qrId: '1',
        phone: '',
        location: '',
        state: '',
        district: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deptSaving, setDeptSaving] = useState(false);
    const [deptSaveStatus, setDeptSaveStatus] = useState('');

    const [newDept, setNewDept] = useState({
        name: '',
        imageUrl: '',
        description: '',
        imageFile: null,
        feedbackConfigs: [createEmptyFeedbackField('positive')]
    });
    const [logoFile, setLogoFile] = useState(null);
    const [bgFile, setBgFile] = useState(null);
    const [adminProfile, setAdminProfile] = useState({ name: '', email: '', password: '', phone: '' });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState(null);
    const resetDeptForm = useCallback(() => ({
        name: '',
        imageUrl: '',
        description: '',
        imageFile: null,
        feedbackConfigs: [createEmptyFeedbackField('positive')]
    }), []);

    const updateNewDept = useCallback((updater) => {
        setNewDept((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
    }, []);

    const handleDeptNameChange = useCallback((value) => {
        setNewDept((prev) => {
            const nextName = value;
            const shouldAutofillDefaults = !hasMeaningfulFeedbackConfigs(prev.feedbackConfigs);
            const defaultConfigs = getDefaultDepartmentFeedbackConfigs(nextName);

            return {
                ...prev,
                name: nextName,
                feedbackConfigs: shouldAutofillDefaults && defaultConfigs.length > 0
                    ? defaultConfigs
                    : prev.feedbackConfigs
            };
        });
    }, []);

    const fetchConfig = useCallback(async (retryCount = 0) => {
        try {
            const dUrl = hospitalId ? `/departments?hospitalId=${hospitalId}` : '/departments';

            const [hRes, dRes] = await Promise.all([
                getHospitalConfig(hospitalId ? { hospitalId } : {}),
                API.get(dUrl)
            ]);

            if (hRes) {
                const departments = ((dRes.data && dRes.data.length > 0) ? dRes.data : (hRes.departments || []))
                    .map(hydrateDepartmentFeedbackConfigs);

                setHospital({
                    themeColor: '#0ca678',
                    qrId: '1',
                    ...hRes,
                    departments
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
    }, [hospitalId]);

    useEffect(() => {
        fetchConfig();
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsed = JSON.parse(userInfo);
            setAdminProfile(prev => ({ ...prev, name: parsed.name, email: parsed.email, phone: parsed.phone || '' }));
        }
    }, [fetchConfig]);

    useEffect(() => {
        if (hospital.themeColor) {
            // Theme color is no longer applied globally to the Admin UI
            // to allow separate aesthetics for Admin and Public Views.
        }
    }, [hospital.themeColor]);

    const handleImageUpload = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = () => {
                toast.error('Image processing failed');
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
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
            if (bgFile) {
                const url = await handleImageUpload(bgFile);
                if (url) updatedHospital.feedbackBgUrl = url;
            }
            const url = hospitalId ? `/hospital?hospitalId=${hospitalId}` : '/hospital';
            const { data } = await API.put(url, updatedHospital);
            setHospital(prev => ({
                ...prev,
                ...data
            }));
            setHospitalConfigCache(data);
            setLogoFile(null);
            setBgFile(null);
            toast.success('Settings updated successfully');
        } catch {
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddDept = async () => {
        if (!newDept.name.trim()) return toast.error('Name is required');
        if (!newDept.imageUrl && !newDept.imageFile) return toast.error('Department Icon (URL or file) is required');

        const feedbackConfigs = buildFeedbackConfigPayload(newDept.feedbackConfigs);
        if (feedbackConfigs.length === 0) {
            return toast.error('Add at least one feedback field');
        }

        for (const config of feedbackConfigs) {
            if (!config.label) return toast.error('Feedback label is required');
            if (config.emailEnabled) {
                if (!config.recipientName) return toast.error(`Recipient name required for "${config.label}"`);
                if (!config.recipientEmail) return toast.error(`Recipient email required for "${config.label}"`);
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.recipientEmail)) return toast.error(`Invalid email for "${config.label}"`);
            }
        }

        try {
            setDeptSaving(true);
            setDeptSaveStatus(editingDeptId ? 'Preparing update...' : 'Preparing department...');
            let finalImageUrl = newDept.imageUrl;
            if (newDept.imageFile) {
                setDeptSaveStatus('Uploading department icon...');
                const url = await handleImageUpload(newDept.imageFile);
                if (url) finalImageUrl = url;
            }
            setDeptSaveStatus(editingDeptId ? 'Saving department changes...' : 'Creating department...');
            const deptPayload = {
                name: newDept.name,
                imageUrl: finalImageUrl,
                description: newDept.description,
                feedbackConfigs,
                positive_feedback: feedbackConfigs.filter((config) => config.type === 'positive').map((config) => config.label).join('; '),
                negative_feedback: feedbackConfigs.filter((config) => config.type === 'negative').map((config) => config.label).join('; '),
                positiveIssues: feedbackConfigs.filter((config) => config.type === 'positive').map((config) => config.label),
                negativeIssues: feedbackConfigs.filter((config) => config.type === 'negative').map((config) => config.label)
            };

            if (editingDeptId) {
                // Update Existing
                const query = hospitalId ? `?hospitalId=${hospitalId}` : '';
                const { data } = await API.put(`/departments/${editingDeptId}${query}`, deptPayload);

                setHospital(prev => ({
                    ...prev,
                    departments: prev.departments.map(d => d._id === editingDeptId ? hydrateDepartmentFeedbackConfigs(data) : d)
                }));
                toast.success('Department updated successfully.');
            } else {
                // Check duplicate for new departments
                const isDuplicate = hospital.departments.some(d => (d.name || '').toLowerCase() === (newDept.name || '').toLowerCase());
                if (isDuplicate) {
                    toast.error('Department already exists with this name');
                    setSaving(false);
                    return;
                }

                const query = hospitalId ? `?hospitalId=${hospitalId}` : '';
                const { data } = await API.post(`/departments${query}`, deptPayload);
                
                setHospital(prev => ({ 
                    ...prev, 
                    departments: [...prev.departments, hydrateDepartmentFeedbackConfigs(data)] 
                }));
                toast.success('Department added successfully.');
            }

            setNewDept(resetDeptForm());
            setEditingDeptId(null);
        } catch (error) {
            console.error('[DEPT-SAVE-ERROR]', error);
            const operation = editingDeptId ? 'update' : 'add';
            const msg = error.response?.data?.message || error.message || `Failed to ${operation} department`;
            toast.error(msg);
        } finally {
            setDeptSaving(false);
            setDeptSaveStatus('');
        }
    };

    const handleRemoveDept = async (id, name) => {
        if (!id) return toast.error('Error: Could not identify department for deletion');
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

        try {
            setSaving(true);

            const response = await API.delete(`/departments/${id}`);

            setHospital(prev => ({
                ...prev,
                departments: prev.departments.filter(d => d._id !== id)
            }));
            if (editingDeptId === id) {
                setEditingDeptId(null);
                setNewDept(resetDeptForm());
            }
            toast.success(`Department "${name}" removed successfully.`);
        } catch (error) {
            console.error('[DEPT-UI] Delete Error:', error);
            const msg = error.response?.data?.message || 'Failed to remove department. Check server logs.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEditDept = (dept) => {
        setEditingDeptId(dept._id);
        // Ensure we load from either the string field or reconstruct from array
        setNewDept({
            name: dept.name,
            imageUrl: dept.imageUrl || '',
            description: dept.description || '',
            imageFile: null,
            feedbackConfigs: normalizeFeedbackConfigsForForm(
                dept.feedbackConfigs,
                dept.positive_feedback || (dept.positiveIssues || []).join('; '),
                dept.negative_feedback || (dept.negativeIssues || []).join('; '),
                dept.name
            )
        });
        // Scroll to add/edit section
        const section = document.getElementById('dept-form-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
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

    const publicFeedbackIdentifier = buildPublicFeedbackIdentifier(hospital);
    const feedbackUrl = `${window.location.origin}/feedback/${publicFeedbackIdentifier || hospital.qrId || '1'}`;

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

            <div className="responsive-aside-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.5fr) 1fr', gap: '2rem', alignItems: 'start' }}>

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

                                {isSuperAdmin && (
                                    <>
                                        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                            <div className="form-group">
                                                <label className="form-label">Contact Number (10 Digits)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    maxLength={10}
                                                    placeholder="e.g. 9876543210"
                                                    value={hospital.phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setHospital({ ...hospital, phone: val });
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Location / Address</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Street or Area"
                                                    value={hospital.location}
                                                    onChange={(e) => setHospital({ ...hospital, location: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                            <div className="form-group">
                                                <label className="form-label">City</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="District Name"
                                                    value={hospital.district}
                                                    onChange={(e) => setHospital({ ...hospital, district: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">State</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="State Name"
                                                    value={hospital.state}
                                                    onChange={(e) => setHospital({ ...hospital, state: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}



                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="form-label">Brand Logo</label>
                                    <div className="responsive-upload-row">
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Brand Logo URL"
                                                value={hospital.logoUrl || ''}
                                                onChange={(e) => setHospital({ ...hospital, logoUrl: e.target.value })}
                                                style={{ marginBottom: '0.75rem' }}
                                            />
                                            <label
                                                className="responsive-upload-card"
                                                htmlFor="brand-logo-file"
                                                style={{
                                                    background: 'linear-gradient(135deg, #f8fafc 0%, #eefaf6 100%)',
                                                }}
                                            >
                                                <div className="responsive-upload-main">
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '0.9rem',
                                                        background: 'var(--grad-primary)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 8px 18px rgba(12, 166, 120, 0.18)'
                                                    }}>
                                                        <Upload size={18} />
                                                    </div>
                                                    <div className="responsive-upload-copy">
                                                        <div className="responsive-upload-title">Choose brand logo</div>
                                                        <div className="responsive-upload-subtitle">
                                                            {logoFile ? logoFile.name : 'PNG, JPG, or SVG image'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    className="responsive-upload-chip"
                                                    style={{
                                                    color: 'var(--primary)',
                                                }}
                                                >
                                                    Browse
                                                </span>
                                            </label>
                                            <input
                                                id="brand-logo-file"
                                                type="file"
                                                onChange={(e) => setLogoFile(e.target.files[0])}
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        {(hospital.logoUrl || logoFile) && (
                                            <div className="responsive-upload-preview" style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '100px', height: '100px',
                                                    border: '2px solid var(--border)', borderRadius: '1rem',
                                                    overflow: 'hidden', background: '#f8fafc',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem'
                                                }}>
                                                    <img
                                                        src={logoFile ? URL.createObjectURL(logoFile) : getAssetUrl(hospital.logoUrl)}
                                                        alt="Logo"
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setHospital({ ...hospital, logoUrl: '' }); setLogoFile(null); }}
                                                    style={{
                                                        position: 'absolute', top: '-10px', right: '-10px',
                                                        background: '#ef4444', color: 'white',
                                                        border: 'none', borderRadius: '50%',
                                                        width: '24px', height: '24px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}
                                                    title="Remove Logo"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="form-label">Feedback Form Background</label>
                                    <div className="responsive-upload-row">
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Background Image URL"
                                                value={hospital.feedbackBgUrl || ''}
                                                onChange={(e) => setHospital({ ...hospital, feedbackBgUrl: e.target.value })}
                                                style={{ marginBottom: '0.75rem' }}
                                            />
                                            <label
                                                className="responsive-upload-card"
                                                htmlFor="feedback-bg-file"
                                                style={{
                                                    background: 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%)',
                                                }}
                                            >
                                                <div className="responsive-upload-main">
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '0.9rem',
                                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 8px 18px rgba(99, 102, 241, 0.18)'
                                                    }}>
                                                        <Upload size={18} />
                                                    </div>
                                                    <div className="responsive-upload-copy">
                                                        <div className="responsive-upload-title">Choose background image</div>
                                                        <div className="responsive-upload-subtitle">
                                                            {bgFile ? bgFile.name : 'Upload the form background image'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    className="responsive-upload-chip"
                                                    style={{
                                                    color: '#4f46e5',
                                                }}
                                                >
                                                    Browse
                                                </span>
                                            </label>
                                            <input
                                                id="feedback-bg-file"
                                                type="file"
                                                onChange={(e) => setBgFile(e.target.files[0])}
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        {(hospital.feedbackBgUrl || bgFile) && (
                                            <div className="responsive-upload-preview" style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '100px', height: '100px',
                                                    border: '2px solid var(--border)', borderRadius: '1rem',
                                                    overflow: 'hidden', background: '#f8fafc',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem'
                                                }}>
                                                    <img
                                                        src={bgFile ? URL.createObjectURL(bgFile) : getAssetUrl(hospital.feedbackBgUrl)}
                                                        alt="Background"
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setHospital({ ...hospital, feedbackBgUrl: '' }); setBgFile(null); }}
                                                    style={{
                                                        position: 'absolute', top: '-10px', right: '-10px',
                                                        background: '#ef4444', color: 'white',
                                                        border: 'none', borderRadius: '50%',
                                                        width: '24px', height: '24px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}
                                                    title="Remove Background"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
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

                            <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border)', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '0.75rem 2rem' }}>
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="card" id="dept-form-section">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Plus size={20} color="var(--primary)" /> {editingDeptId ? `Editing: ${newDept.name}` : 'Add Service Department'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'start' }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Department Name"
                                    value={newDept.name}
                                    onChange={(e) => handleDeptNameChange(e.target.value)}
                                />
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Department Icon</label>
                                    <div className="responsive-upload-row">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ position: 'relative' }}>
                                                <Upload size={18} color="var(--primary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', pointerEvents: 'none', opacity: 0.7 }} />
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Enter image URL or click to upload"
                                                    value={newDept.imageFile ? newDept.imageFile.name : newDept.imageUrl}
                                                    onChange={(e) => {
                                                        if (newDept.imageFile) {
                                                            updateNewDept({ imageUrl: e.target.value, imageFile: null });
                                                        } else {
                                                            updateNewDept({ imageUrl: e.target.value });
                                                        }
                                                    }}
                                                    onClick={() => document.getElementById('dept-icon-upload')?.click()}
                                                    style={{ cursor: 'pointer', paddingLeft: '40px' }}
                                                />
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                                                You can either paste an image URL or upload a file
                                            </p>
                                            <label
                                                className="responsive-upload-card"
                                                htmlFor="dept-icon-upload"
                                                style={{
                                                    background: 'linear-gradient(135deg, #f8fafc 0%, #eefaf6 100%)',
                                                }}
                                            >
                                                <div className="responsive-upload-main">
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '0.9rem',
                                                        background: 'var(--grad-primary)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 8px 18px rgba(12, 166, 120, 0.18)'
                                                    }}>
                                                        <Upload size={18} />
                                                    </div>
                                                    <div className="responsive-upload-copy">
                                                        <div className="responsive-upload-title">Choose department icon</div>
                                                        <div className="responsive-upload-subtitle">
                                                            {newDept.imageFile ? newDept.imageFile.name : 'PNG, JPG, or SVG image'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    className="responsive-upload-chip"
                                                    style={{
                                                    color: 'var(--primary)',
                                                }}
                                                >
                                                    Browse
                                                </span>
                                            </label>
                                            <input
                                                id="dept-icon-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => updateNewDept({ imageFile: e.target.files[0] })}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        {(newDept.imageFile || newDept.imageUrl) ? (
                                            <div className="responsive-upload-preview" style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '100px', height: '100px',
                                                    border: '2px solid var(--border)', borderRadius: '1rem',
                                                    overflow: 'hidden', background: '#f8fafc',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem'
                                                }}>
                                                    <img
                                                        src={newDept.imageFile ? URL.createObjectURL(newDept.imageFile) : getAssetUrl(newDept.imageUrl)}
                                                        alt="Preview"
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateNewDept({ imageUrl: '', imageFile: null })}
                                                    style={{
                                                        position: 'absolute', top: '-10px', right: '-10px',
                                                        background: '#ef4444', color: 'white',
                                                        border: 'none', borderRadius: '50%',
                                                        width: '24px', height: '24px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}
                                                    title="Remove Icon"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ width: '100px', height: '100px', border: '2px dashed var(--border)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PREVIEW</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    className="form-control"
                                    placeholder="Short summary of services"
                                    value={newDept.description}
                                    onChange={(e) => updateNewDept({ description: e.target.value })}
                                />
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Feedback Fields</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => updateNewDept((prev) => ({ ...prev, feedbackConfigs: [...prev.feedbackConfigs, createEmptyFeedbackField('positive')] }))}
                                                className="btn-outline"
                                                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '2rem' }}
                                            >
                                                + Positive
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateNewDept((prev) => ({ ...prev, feedbackConfigs: [...prev.feedbackConfigs, createEmptyFeedbackField('negative')] }))}
                                                className="btn-outline"
                                                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '2rem' }}
                                            >
                                                + Negative
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {newDept.feedbackConfigs.map((config, index) => (
                                            <div key={`${config.type}-${index}`} style={{ border: '1px solid #dbe4f0', borderRadius: '0.9rem', background: 'white', padding: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.3rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        color: config.type === 'negative' ? '#b91c1c' : '#047857',
                                                        background: config.type === 'negative' ? '#fee2e2' : '#d1fae5'
                                                    }}>
                                                        {config.type}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateNewDept((prev) => {
                                                                const updated = prev.feedbackConfigs.filter((_, configIndex) => configIndex !== index);
                                                                return {
                                                                    ...prev,
                                                                    feedbackConfigs: updated.length > 0 ? updated : [createEmptyFeedbackField('positive')]
                                                                };
                                                            });
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                        title="Delete feedback field"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                    <select
                                                        className="form-control"
                                                        value={config.type}
                                                        onChange={(e) => {
                                                            const updated = [...newDept.feedbackConfigs];
                                                            updated[index] = { ...updated[index], type: e.target.value };
                                                            updateNewDept({ feedbackConfigs: updated });
                                                        }}
                                                    >
                                                        <option value="positive">Positive</option>
                                                        <option value="negative">Negative</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Feedback label"
                                                        value={config.label}
                                                        onChange={(e) => {
                                                            const updated = [...newDept.feedbackConfigs];
                                                            updated[index] = { ...updated[index], label: e.target.value };
                                                            updateNewDept({ feedbackConfigs: updated });
                                                        }}
                                                    />
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={config.emailEnabled}
                                                            onChange={(e) => {
                                                                const updated = [...newDept.feedbackConfigs];
                                                                updated[index] = {
                                                                    ...updated[index],
                                                                    emailEnabled: e.target.checked,
                                                                    recipientName: e.target.checked ? updated[index].recipientName : '',
                                                                    recipientEmail: e.target.checked ? updated[index].recipientEmail : ''
                                                                };
                                                                updateNewDept({ feedbackConfigs: updated });
                                                            }}
                                                        />
                                                        Send Email
                                                    </label>
                                                    {config.emailEnabled && (
                                                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Recipient Name"
                                                                value={config.recipientName}
                                                                onChange={(e) => {
                                                                    const updated = [...newDept.feedbackConfigs];
                                                                    updated[index] = { ...updated[index], recipientName: e.target.value };
                                                                    updateNewDept({ feedbackConfigs: updated });
                                                                }}
                                                            />
                                                            <input
                                                                type="email"
                                                                className="form-control"
                                                                placeholder="Recipient Email"
                                                                value={config.recipientEmail}
                                                                onChange={(e) => {
                                                                    const updated = [...newDept.feedbackConfigs];
                                                                    updated[index] = { ...updated[index], recipientEmail: e.target.value };
                                                                    updateNewDept({ feedbackConfigs: updated });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddDept}
                                    className="btn-primary"
                                    style={{
                                        background: editingDeptId ? 'var(--primary)' : '#1e293b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                    disabled={deptSaving || saving}
                                >
                                    {deptSaving && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>}
                                    <span>
                                        {deptSaving
                                            ? (deptSaveStatus || 'Processing...')
                                            : (editingDeptId ? 'Save Department Changes' : '+ Add Department to Workflow')}
                                    </span>
                                </button>
                                {editingDeptId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingDeptId(null);
                                            setNewDept(resetDeptForm());
                                        }}
                                        className="btn-outline"
                                        style={{ marginTop: '-0.5rem', width: '100%', borderColor: '#64748b', color: '#64748b' }}
                                        disabled={deptSaving}
                                    >Cancel & Reset Form</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Departments Listing */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Active Departments</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {hospital?.departments?.map(dept => (
                                <div key={dept._id || dept.name} className="card" style={{ padding: 0, position: 'relative', overflow: 'hidden', background: '#f8fafc', border: editingDeptId === dept._id ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '1rem' }}>
                                    <div style={{
                                        position: 'relative',
                                        background: '#f8fafc',
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        border: editingDeptId === dept._id ? '2px solid var(--primary)' : '1px solid transparent',
                                        borderRadius: '1rem 1rem 0 0'
                                    }}>
                                        {editingDeptId === dept._id && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '0.75rem 0 0.75rem 0', fontWeight: 800, zIndex: 5 }}>
                                                EDITING
                                            </div>
                                        )}
                                        {dept.imageUrl ? (
                                            <img src={getAssetUrl(dept.imageUrl)} alt="" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No icon</div>
                                        )}
                                    </div>
                                    <div style={{ padding: '1rem', border: editingDeptId === dept._id ? '2px solid var(--primary)' : 'none', borderTop: 'none', borderRadius: '0 0 1rem 1rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: editingDeptId === dept._id ? 'var(--primary)' : 'inherit' }}>{dept.name}</div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', height: '2.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.description}</p>
                                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                                            {(dept.feedbackConfigs || []).length > 0 ? `${dept.feedbackConfigs.length} feedback fields configured` : 'No feedback fields configured'}
                                        </p>
                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        right: '0',
                                        bottom: '0',
                                        left: '0',
                                        background: 'rgba(255,255,255,0.7)',
                                        display: (editingDeptId && editingDeptId !== dept._id) ? 'flex' : 'none',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '1rem',
                                        zIndex: 10
                                    }}>
                                        <div style={{ background: '#1e293b', color: 'white', padding: '4px 12px', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 600 }}>Save current edit first</div>
                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        right: '10px',
                                        display: editingDeptId === dept._id ? 'none' : 'flex',
                                        gap: '6px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => handleEditDept(dept)}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                color: 'var(--primary)',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <Edit size={12} /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDept(dept._id, dept.name)}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #fee2e2',
                                                borderRadius: '6px',
                                                color: '#ef4444',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
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
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Phone Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ background: 'white' }}
                                    maxLength={10}
                                    placeholder="10 digit number"
                                    value={adminProfile.phone}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setAdminProfile({ ...adminProfile, phone: val });
                                    }}
                                />
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

            </div>
        </div>
    );
};

export default AdminSettings;
