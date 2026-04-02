import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import API, { BASE_ASSET_URL, getAssetUrl } from '../api';
import toast, { Toaster } from 'react-hot-toast';
import './PublicFeedback.css';
import { getHospitalConfig } from '../services/hospitalConfig';


const DEFAULT_ISSUES = {
    positive: ['Friendly Staff', 'Clear Communication', 'Helpful Information'],
    negative: ['Long Wait Time', 'High Cost', 'Complex Process']
};

const DEPARTMENT_ISSUES = {

    'Admission': {
        positive: ['Fast Process', 'Friendly Staff', 'Clear Instructions', 'Easy Documentation'],
        negative: ['Long Wait Time', 'Confusing Paperwork', 'Unhelpful Staff', 'Delay in Entry']
    },
    'Waiting Room': {
        positive: ['Comfortable Seating', 'Good Ventilation', 'Drinking Water Available', 'Quiet Environment'],
        negative: ['Overcrowded', 'Dirty Floors', 'No Seat Available', 'Noisy Area']
    },
    'Pharmacy': {
        positive: ['Quick Medicine Delivery', 'All Meds Available', 'Helpful Staff', 'Clear Dosage Guidance'],
        negative: ['Medicine Out of Stock', 'Long Queue', 'Wrong Medicine Given', 'Rude Pharmacist']
    },
    'Nurse/Doctor': {
        positive: ['Detailed Consultation', 'Polite Behavior', 'Quick Response', 'Professional Care'],
        negative: ['Rude Behavior', 'Inattentive', 'Lack of Information', 'Long Waiting for Doctor']
    },
    'Parking': {
        positive: ['Ample Space', 'Safe & Secure', 'Easy to Find', 'Well Lit'],
        negative: ['No Space Available', 'Highly Expensive', 'Unmanaged Entry', 'Poor Lighting']
    },
    'Internet': {
        positive: ['High Speed WiFi', 'Easy Login', 'Stable Signal', 'Free Connection'],
        negative: ['Slow Internet', 'Signal Drops', 'Complex Login', 'No WiFi Access']
    }
};

const normalizeFeedbackConfigs = (dept) => {
    if (Array.isArray(dept?.feedbackConfigs) && dept.feedbackConfigs.length > 0) {
        return dept.feedbackConfigs
            .map((config) => ({
                type: config?.type === 'negative' ? 'negative' : 'positive',
                label: (config?.label || '').trim()
            }))
            .filter((config) => config.label);
    }

    const positives = (dept?.positive_feedback ? dept.positive_feedback.split(';').map((item) => item.trim()).filter(Boolean) : (dept?.positiveIssues || []));
    const negatives = (dept?.negative_feedback ? dept.negative_feedback.split(';').map((item) => item.trim()).filter(Boolean) : (dept?.negativeIssues || []));

    return [
        ...positives.map((label) => ({ type: 'positive', label })),
        ...negatives.map((label) => ({ type: 'negative', label }))
    ];
};

const getDepartmentFeedbackOptions = (dept) => {
    const configured = normalizeFeedbackConfigs(dept);
    if (configured.length > 0) {
        return {
            positive: configured.filter((config) => config.type === 'positive').map((config) => config.label),
            negative: configured.filter((config) => config.type === 'negative').map((config) => config.label)
        };
    }

    const deptNameNormalized = (dept?.name || '').toLowerCase();
    const hardcodedIssues = Object.keys(DEPARTMENT_ISSUES).find((key) => key.toLowerCase() === deptNameNormalized);
    return DEPARTMENT_ISSUES[hardcodedIssues] || DEFAULT_ISSUES;
};

const PublicFeedback = () => {

    const { qrId } = useParams();
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deactivationMessage, setDeactivationMessage] = useState(null);
    const [error, setError] = useState(null);

    const [currentStep, setCurrentStep] = useState(1);
    const [patientName, setPatientName] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [, setSubmittedData] = useState(null);

    useEffect(() => {
        const fetchConfig = async (retryCount = 0) => {
            if (!qrId) {
                setLoading(false);
                return;
            }

            try {
                const data = await getHospitalConfig({ qrId });
                setHospital(data);

                if (data.themeColor) {
                    // Theme color is now applied locally to the container via inline styles
                    // to prevent "connecting" the Admin and Public form themes globally.
                }

                const query = new URLSearchParams(window.location.search);
                const deptParam = query.get('dept');
                if (deptParam && data.departments) {
                    const targetDept = data.departments.find(d => d.name.toLowerCase() === deptParam.toLowerCase());
                    if (targetDept) {
                        setSelectedCategories([{
                            department: targetDept.name,
                            issue: [],
                            customText: '',
                            reviewType: '',
                            feedback: '',
                            imageFile: null,
                            imageUrl: targetDept.imageUrl
                        }]);
                        setCurrentStep(3);
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error('Config fetch error:', error);
                // Handle specific errors
                if (error.response?.status === 403 && error.response?.data?.isDeactivated) {
                    setDeactivationMessage(error.response.data.message);
                    setLoading(false);
                    return;
                }

                if (error.response?.status === 404) {
                    setError('Invalid QR Code. Please ensure you have scanned the correct code or the hospital has saved their configuration.');
                    setLoading(false);
                    return;
                }

                // Retry only for potential network issues (not for 4xx)
                if (retryCount < 2 && (!error.response || error.response.status >= 500)) {
                    setTimeout(() => fetchConfig(retryCount + 1), 2000);
                } else {
                    setError('Connection issue: Unable to load the feedback form.');
                    setLoading(false);
                }
            }
        };
        fetchConfig();
    }, [qrId]);

    const videoRef = useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraDept, setCameraDept] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // Default to back camera

    const startCamera = async (dept) => {
        setCameraDept(dept);
        setIsCameraOpen(true);
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
        setCameraDept(null);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) {
                toast.error('Failed to capture photo. Please try again.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                updateImageFile(cameraDept, reader.result);
                stopCamera();
                toast.success("Photo captured!");
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.7);
    };

    useEffect(() => {
        let stream = null;
        if (isCameraOpen && videoRef.current) {
            const setupCamera = async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: facingMode } 
                    });
                    videoRef.current.srcObject = stream;
                } catch (err) {
                    console.error("Camera error:", err);
                    toast.error("Camera access denied or not available.");
                    setIsCameraOpen(false);
                }
            };
            setupCamera();
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isCameraOpen, facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const toggleDepartment = (dept) => {
        setSelectedCategories(prev => {
            const exists = prev.find(c => c.department === dept.name);
            if (exists) {
                // If it's already selected, clicking it again de-selects it
                return [];
            } else {
                // Select only the current department, removing any others
                return [{
                    department: dept.name,
                    issue: [],
                    customText: '',
                    reviewType: '',
                    feedback: '',
                    image: null,
                    imageUrl: dept.imageUrl
                }];
            }
        });
    };

    const toggleIssue = (dept, issue, isPositive, deptData) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                const currentIssues = c.issue;
                const newIssues = currentIssues.includes(issue)
                    ? currentIssues.filter(i => i !== issue)
                    : [...currentIssues, issue];

                // Check which groups are present in the new selection
                const hasPositive = newIssues.some(iss => deptData.positive.includes(iss));
                const hasNeedsWork = newIssues.some(iss => deptData.negative.includes(iss));

                // If both are selected (though the UI will disable them, this is extra safety),
                // we'll handle it during submission or here.
                // Let's also derive the reviewType ONLY from these checkboxes.
                let reviewType = '';
                if (hasPositive && !hasNeedsWork) reviewType = 'Positive';
                else if (hasNeedsWork && !hasPositive) reviewType = 'Negative';
                else if (hasPositive && hasNeedsWork) reviewType = 'Mixed';

                return { ...c, issue: newIssues, reviewType };
            }
            return c;
        }));
    };

    const updateCustomText = (dept, text) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) return { ...c, customText: text };
            return c;
        }));
    };

    const updateRating = (dept, fbValue) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                // Determine a fallback reviewType if no issues are selected
                let newReviewType = c.reviewType;
                if (!c.issue || c.issue.length === 0) {
                    if (fbValue === 'completely_satisfied') newReviewType = 'Positive';
                    else if (fbValue === 'partially_satisfied') newReviewType = 'Mixed';
                    else if (fbValue === 'not_satisfied') newReviewType = 'Negative';
                }
                return { ...c, feedback: fbValue, reviewType: newReviewType || 'Mixed' };
            }
            return c;
        }));
    };

    const updateImageFile = async (dept, fileOrBase64) => {
        if (!fileOrBase64) return;

        if (typeof fileOrBase64 === 'string') {
            setSelectedCategories(prev => prev.map(c => {
                if (c.department === dept) return { ...c, image: fileOrBase64 };
                return c;
            }));
            return;
        }

        const compressImage = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const maxSize = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        try {
            const compressedDataUrl = await compressImage(fileOrBase64);
            setSelectedCategories(prev => prev.map(c => {
                if (c.department === dept) return { ...c, image: compressedDataUrl };
                return c;
            }));
        } catch (err) {
            console.error('Image compression failed:', err);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedCategories(prev => prev.map(c => {
                    if (c.department === dept) return { ...c, image: reader.result };
                    return c;
                }));
            };
            reader.readAsDataURL(fileOrBase64);
        }
    };

    const handleNextStep = () => {
        if (currentStep === 2 && selectedCategories.length === 0) {
            toast.error('Please select a department.');
            return;
        }
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        if (selectedCategories.some(c => !c.feedback)) {
            toast.error('Please select satisfaction.');
            setSubmitting(false);
            return;
        }

        // Validation for Mixed feedback removed to allow both positive and negative in one submission

        if (selectedCategories.some(c => c.issue.length === 0 && !c.customText.trim())) {
            toast.error('Please select at least one issue or add comments.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                patientName,
                patientEmail,
                hospital: hospital._id,
                categories: selectedCategories.map(c => {
                    const dbDept = hospital?.departments?.find(d => d.name.toLowerCase() === c.department.toLowerCase());
                    const deptData = getDepartmentFeedbackOptions(dbDept || { name: c.department });

                    return {
                        department: c.department,
                        issue: c.issue, 
                        positive_issues: (c.reviewType === 'Positive' && deptData.positive.length === 0) ? c.issue : c.issue.filter(iss => deptData.positive.includes(iss)),
                        negative_issues: (c.reviewType === 'Negative' && deptData.negative.length === 0) ? c.issue : c.issue.filter(iss => deptData.negative.includes(iss)),
                        positive_feedback: (c.reviewType === 'Positive' && deptData.positive.length === 0) ? c.issue : c.issue.filter(iss => deptData.positive.includes(iss)),
                        negative_feedback: (c.reviewType === 'Negative' && deptData.negative.length === 0) ? c.issue : c.issue.filter(iss => deptData.negative.includes(iss)),
                        note: c.customText, // Send category text as note
                        reviewType: c.reviewType,
                        feedback: c.feedback, // Renamed from rating
                        image: c.image // This is now a Base64 string
                    };
                })
            };

            const { data } = await API.post('/feedback', payload);
            setSubmittedData(data);
            setSubmitted(true);
            toast.success('Submitted!');
        } catch (error) {
            console.error('Submission error:', error);
            const msg = error.response?.data?.message || 'Submission failed.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="feedback-container" style={{ background: '#F3F4F6', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
            <div className="loader" style={{ width: '48px', height: '48px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: '#6B7280', fontWeight: 600 }}>Loading feedback portal...</p>
        </div>
    );

    if (deactivationMessage) {
        return (
            <div className="feedback-container" style={{
                background: '#F3F4F6',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '1.5rem'
            }}>
                <div className="feedback-card card shadow-premium animate-pop" style={{ maxWidth: '32rem', textAlign: 'center', borderTop: `6px solid #EF4444` }}>
                    <div style={{ fontSize: '2rem', color: '#EF4444', marginBottom: '1rem', fontWeight: 800 }}>ALERT!</div>
                    <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Notice</h2>
                    <p style={{ color: '#4B5563', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                        {deactivationMessage}
                    </p>
                    <button className="btn-outline" onClick={() => window.location.href = '/'}>
                        Return Home
                    </button>
                    <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#9CA3AF' }}>Powered by PatientLink HQ</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="feedback-container" style={{
                background: hospital?.themeColor ? `linear-gradient(135deg, ${hospital.themeColor}22 0%, ${hospital.themeColor}05 100%)` : '#F3F4F6',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div className="feedback-card card shadow-premium animate-pop" style={{ maxWidth: '32rem', textAlign: 'center', borderTop: `6px solid ${hospital?.themeColor || 'var(--primary)'}` }}>
                    <div style={{ fontSize: '4rem', color: hospital?.themeColor || '#10B981', marginBottom: '1rem', fontWeight: 800 }}>OK</div>
                    <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Thank You!</h2>
                    <p style={{ color: '#6B7280', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Your feedback has been received and will help us improve our services.</p>

                    <button className="btn-primary" onClick={() => window.location.reload()}>
                        Done
                    </button>
                </div>
            </div>
        );
    }

    const containerStyle = {
        '--primary': hospital?.themeColor || '#4F46E5',
        ...(hospital?.feedbackBgUrl
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${getAssetUrl(hospital.feedbackBgUrl)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }
            : (hospital?.themeColor
                ? { background: `linear-gradient(135deg, ${hospital.themeColor} 0%, ${hospital.themeColor}bb 100%)` }
                : { backgroundColor: '#F3F4F6' }))
    };

    return (
        <div className="feedback-container branded-bg" style={containerStyle}>
            {hospital?.themeColor && (
                <>
                    <div className="bg-blob-1" style={{ backgroundColor: 'white', opacity: 0.1 }}></div>
                    <div className="bg-blob-2" style={{ backgroundColor: 'white', opacity: 0.05 }}></div>
                </>
            )}
            <div className="feedback-wrapper">
                <Toaster />
                <div className="feedback-card card premium-card">
                    <div className="feedback-header">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <div className="loader" style={{ width: '32px', height: '32px' }}></div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Syncing hospital profile...</span>
                            </div>
                        ) : hospital?.logoUrl && (
                            <img
                                src={getAssetUrl(hospital.logoUrl)}
                                alt="Hospital Logo"
                                className="feedback-logo"
                            />
                        )}
                        <h1 className="feedback-title" style={{ fontSize: '1.875rem' }}>{hospital?.name || 'Hospital'}</h1>

                        {(loading || error || deactivationMessage) && (
                            <div style={{ height: '2rem' }} /> 
                        )}

                        {!loading && !error && !deactivationMessage && (
                            <div className="stepper-container">
                                {[1, 2, 3].map(step => (
                                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className="step-circle" style={{
                                            backgroundColor: step === currentStep ? 'var(--primary)' : step < currentStep ? '#10B981' : '#E5E7EB',
                                            color: step <= currentStep ? 'white' : '#6B7280'
                                        }}>
                                            {step < currentStep ? 'OK' : step}
                                        </div>
                                        {step < 3 && <div className="step-line" style={{ backgroundColor: step < currentStep ? '#10B981' : '#E5E7EB' }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="fade-in" style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                             <div style={{ fontSize: '2rem', fontWeight: 800 }}>OFFLINE</div>
                            <h3 style={{ color: '#ef4444' }}>Service Unavailable</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{error}</p>
                            <button onClick={() => window.location.reload()} className="btn-outline">Retry Connection</button>
                        </div>
                    )}

                    {!loading && !error && !deactivationMessage && currentStep === 1 && (
                        <div className="fade-in">
                            <h3 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Step 1: Contact Detail</h3>
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>You can skip this if you prefer to remain anonymous.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Full Name <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 400 }}>(Optional)</span></label>
                                    <input type="text" className="form-control" placeholder="e.g. John Doe" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 400 }}>(Optional)</span></label>
                                    <input type="email" className="form-control" placeholder="email@example.com" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} />
                                </div>
                                <button onClick={handleNextStep} className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
                                    {(!patientName && !patientEmail) ? "Skip & Continue →" : "Next Step →"}
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="fade-in">
                            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Step 2: Department</h3>
                            <div className="dept-selection-grid">
                                {hospital?.departments.map((dept) => {
                                    const isSelected = selectedCategories.some(c => c.department === dept.name);
                                    return (
                                        <div
                                            key={dept.name}
                                            onClick={() => toggleDepartment(dept)}
                                            style={{
                                                cursor: 'pointer', borderRadius: '1rem', border: `2px solid ${isSelected ? 'var(--primary)' : '#E5E7EB'}`,
                                                backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'white'
                                            }}
                                        >
                                            {dept.imageUrl ? (
                                                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '0.5rem' }}>
                                                    <img
                                                        src={getAssetUrl(dept.imageUrl)}
                                                        alt={dept.name}
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ height: '100px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>No Image</div>
                                            )}
                                            <div style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary)' : '#374151', fontSize: '1rem', textTransform: 'uppercase' }}>{dept.name}</div>
                                                {dept.description && dept.description.toLowerCase() !== dept.name.toLowerCase() && (
                                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>{dept.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="btn-group">
                                <button onClick={handlePrevStep} className="btn-outline">← Back</button>
                                <button onClick={handleNextStep} className="btn-primary" style={{ flex: 2 }}>Continue →</button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="fade-in">
                            <form onSubmit={handleSubmit}>
                                {selectedCategories.map((cat) => {
                                    const dbDept = hospital?.departments?.find(d => d.name.toLowerCase() === cat.department.toLowerCase());
                                    const deptData = getDepartmentFeedbackOptions(dbDept || { name: cat.department });

                                    return (
                                        <div key={cat.department} className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #E5E7EB', borderRadius: '1.25rem' }}>
                                            {/* Enhanced Header with properly resized image */}
                                            <div style={{ position: 'relative', width: '100%', height: '200px', background: '#f8fafc', overflow: 'hidden' }}>
                                                {cat.imageUrl ? (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                                        <img
                                                            src={getAssetUrl(cat.imageUrl)}
                                                            alt={cat.department}
                                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '100%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Dept Image</div>
                                                )}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    background: 'rgba(0,0,0,0.4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '1.5rem',
                                                    textAlign: 'center'
                                                }}>
                                                    <h4 style={{
                                                        color: 'white',
                                                        fontSize: '2rem',
                                                        fontWeight: '800',
                                                        margin: 0,
                                                        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                                        letterSpacing: '-0.02em',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {cat.department}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div style={{ padding: '1.5rem' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Satisfaction:</label>
                                                    <select className="form-control" value={cat.feedback} onChange={(e) => updateRating(cat.department, e.target.value)} required>
                                                        <option value="" disabled>-- Select --</option>
                                                        <option value="completely_satisfied">Completely Satisfied</option>
                                                        <option value="partially_satisfied">Partially Satisfied</option>
                                                        <option value="not_satisfied">Not Satisfied</option>
                                                    </select>
                                                </div>

                                                <div className="issues-grid">
                                                    <div>
                                                        <label className="form-label" style={{ 
                                                            color: '#10B981', 
                                                            display: 'flex', 
                                                            alignItems: 'center'
                                                        }}>
                                                            Positive
                                                        </label>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {deptData.positive.map(iss => {
                                                                return (
                                                                    <label key={iss} style={{ 
                                                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                                                        cursor: 'pointer'
                                                                    }}>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={cat.issue.includes(iss)} 
                                                                            onChange={() => toggleIssue(cat.department, iss, true, deptData)} 
                                                                        />
                                                                        {iss}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="form-label" style={{ 
                                                            color: '#EF4444', 
                                                            display: 'flex', 
                                                            alignItems: 'center'
                                                        }}>
                                                            Negative
                                                        </label>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {deptData.negative.map(iss => {
                                                                return (
                                                                    <label key={iss} style={{ 
                                                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                                                        cursor: 'pointer'
                                                                    }}>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={cat.issue.includes(iss)} 
                                                                            onChange={() => toggleIssue(cat.department, iss, false, deptData)} 
                                                                        />
                                                                        {iss}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Photo (Optional):</label>
                                                    <div className="evidence-grid">
                                                        <button type="button" onClick={() => startCamera(cat.department)} className="btn-outline" style={{ display: 'flex', flexDirection: 'column', height: '80px', gap: '4px', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', width: '100%' }}>
                                                             Camera
                                                        </button>
                                                        <label className="btn-outline" style={{ display: 'flex', flexDirection: 'column', height: '80px', gap: '4px', cursor: 'pointer', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', width: '100%', margin: 0 }}>
                                                             Gallery
                                                            <input type="file" accept="image/*" onChange={(e) => updateImageFile(cat.department, e.target.files[0])} style={{ display: 'none' }} />
                                                        </label>
                                                    </div>
                                                     {cat.image && <div className="photo-selection-status"><span>Photo Attached</span></div>}
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Comments:</label>
                                                    <textarea className="form-control" rows="3" value={cat.customText} onChange={(e) => updateCustomText(cat.department, e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}


                                <div className="btn-group">
                                    <button type="button" onClick={handlePrevStep} className="btn-outline">← Back</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Feedback'}</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div >

            {isCameraOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '90%', maxWidth: '500px', background: '#000', borderRadius: '1rem', overflow: 'hidden' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <span 
                                role="button"
                                className="camera-btn-cancel"
                                onClick={stopCamera}
                                style={{ minWidth: '100px', textAlign: 'center' }}
                            >Cancel</span>
                            <span 
                                role="button"
                                className="camera-btn-rotate"
                                onClick={toggleCamera}
                                style={{ 
                                    minWidth: '100px', 
                                    textAlign: 'center',
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                     fontSize: '0.9rem',
                                     fontWeight: '600'
                                 }}
                             >Rotate</span>
                            <span 
                                role="button"
                                className="camera-btn-capture"
                                onClick={capturePhoto}
                                style={{ minWidth: '100px', textAlign: 'center' }}
                            >Capture</span>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PublicFeedback;
