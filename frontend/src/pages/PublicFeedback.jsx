import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';

const DEFAULT_ISSUES = {
    positive: ['Professional Staff', 'Clean Environment', 'Quick Service', 'Clear Communication', 'Helpful Information'],
    negative: ['Long Waiting Time', 'Rude Behavior', 'Lack of Cleanliness', 'High Cost', 'Complex Process']
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

const PublicFeedback = () => {
    const { qrId } = useParams();
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    // Wizard Step State
    const [currentStep, setCurrentStep] = useState(1);

    // Form Data State
    const [patientName, setPatientName] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [comments, setComments] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await API.get(`/hospital?qrId=${qrId}`);
                setHospital(data);
                if (data.themeColor) {
                    const themeColor = data.themeColor.startsWith('#') ? data.themeColor : '#4F46E5';
                    document.documentElement.style.setProperty('--primary', themeColor);
                }

                // Check for department deep link
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
                            rating: '',
                            imageFile: null,
                            imageUrl: targetDept.imageUrl
                        }]);
                        setCurrentStep(3); // Skip straight to details
                    }
                }
            } catch (error) {
                toast.error('Failed to load feedback form configuration.');
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const videoRef = useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraDept, setCameraDept] = useState(null);

    const startCamera = async (dept) => {
        setCameraDept(dept);
        setIsCameraOpen(true);
        // We'll trigger the stream via useEffect after render to find the videoRef
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
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            updateImageFile(cameraDept, file);
            stopCamera();
            toast.success("Photo captured!");
        }, 'image/jpeg');
    };

    useEffect(() => {
        let stream = null;
        if (isCameraOpen && videoRef.current) {
            const setupCamera = async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    videoRef.current.srcObject = stream;
                } catch (err) {
                    toast.error("Camera access denied or device not found.");
                    setIsCameraOpen(false);
                }
            };
            setupCamera();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen]);

    const toggleDepartment = (dept) => {
        // Only allow one category selection as requested
        setSelectedCategories([{
            department: dept.name,
            issue: [],
            customText: '',
            reviewType: '', // Default, but we'll use dynamic coloring now
            rating: '',
            imageFile: null,
            imageUrl: dept.imageUrl
        }]);
    };

    const toggleIssue = (dept, issue) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                const newIssues = c.issue.includes(issue)
                    ? c.issue.filter(i => i !== issue)
                    : [...c.issue, issue];
                return { ...c, issue: newIssues };
            }
            return c;
        }));
    };


    const updateCustomText = (dept, text) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                return { ...c, customText: text };
            }
            return c;
        }));
    };

    const updateReviewType = (dept, reviewType) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                return { ...c, reviewType };
            }
            return c;
        }));
    };

    const updateRating = (dept, rating) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                let reviewType = '';
                if (rating === 'Completely Satisfied') {
                    reviewType = 'Positive';
                } else if (rating !== '') {
                    reviewType = 'Negative';
                }
                return { ...c, rating, reviewType };
            }
            return c;
        }));
    };

    const updateImageFile = (dept, file) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                return { ...c, imageFile: file };
            }
            return c;
        }));
    };

    const handleNextStep = () => {
        if (currentStep === 2 && selectedCategories.length === 0) {
            toast.error('Please select at least one department before continuing.');
            return;
        }
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const missingRequiredSelections = selectedCategories.find(c => (c.issue.length === 0 && !c.customText.trim()));
        if (missingRequiredSelections) {
            toast.error('Please select at least one issue or provide details for all chosen departments.');
            setSubmitting(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('patientName', patientName);
            formData.append('patientEmail', patientEmail);
            formData.append('comments', comments);

            // Format categories to send as JSON string
            const catsToSubmit = selectedCategories.map(c => ({
                department: c.department,
                issue: c.issue,
                customText: c.customText,
                reviewType: c.reviewType,
                rating: c.rating
            }));
            formData.append('categories', JSON.stringify(catsToSubmit));

            formData.append('hospital', hospital._id);

            // Append each file with a specific index key to match backend
            selectedCategories.forEach((c, index) => {
                if (c.imageFile) {
                    formData.append(`image_${index}`, c.imageFile);
                }
            });

            await API.post('/feedback', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSubmitted(true);
            toast.success('Feedback submitted successfully!');
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>Loading Form...</div>;

    if (submitted) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: hospital?.themeColor ? `${hospital.themeColor}12` : '#F3F4F6',
                backgroundImage: hospital?.themeColor ? `radial-gradient(at 0% 0%, ${hospital.themeColor}15 0, transparent 40%), radial-gradient(at 100% 100%, ${hospital.themeColor}0D 0, transparent 40%)` : 'none',
                transition: 'background-color 0.5s ease'
            }}>
                <div className="card" style={{ maxWidth: '32rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', color: '#10B981', marginBottom: '1rem' }}>✓</div>
                    <h2 style={{ marginBottom: '1rem' }}>Thank You!</h2>
                    <p style={{ color: '#6B7280' }}>Your feedback has been received. We appreciate your time to help us improve.</p>
                    {patientEmail && <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#4B5563' }}>A confirmation email has been sent to you.</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: hospital?.themeColor ? `${hospital.themeColor}12` : '#F3F4F6',
            backgroundImage: hospital?.themeColor ? `radial-gradient(at 0% 0%, ${hospital.themeColor}15 0, transparent 40%), radial-gradient(at 100% 100%, ${hospital.themeColor}0D 0, transparent 40%)` : 'none',
            transition: 'all 0.5s ease',
            padding: '2rem 1.5rem'
        }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
                <Toaster />
                <div className="card" style={{ padding: '2.5rem' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        {hospital?.logoUrl && (
                            <img
                                src={hospital.logoUrl.startsWith('/') ? `http://localhost:5000${hospital.logoUrl}` : hospital.logoUrl}
                                alt="Hospital Logo"
                                style={{ height: '80px', objectFit: 'contain', marginBottom: '1rem' }}
                            />
                        )}
                        <h1 style={{ color: '#111827', fontSize: '1.875rem' }}>{hospital?.name || 'Hospital'} Feedback</h1>

                        {/* Progress Bar */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                            {[1, 2, 3].map(step => (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: step === currentStep ? '#4F46E5' : step < currentStep ? '#10B981' : '#E5E7EB',
                                        color: step <= currentStep ? 'white' : '#6B7280',
                                        fontWeight: 'bold', fontSize: '0.875rem', transition: 'var(--transitions)'
                                    }}>
                                        {step < currentStep ? '✓' : step}
                                    </div>
                                    {step < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: step < currentStep ? '#10B981' : '#E5E7EB', transition: 'var(--transitions)' }} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STEP 1: Contact Information */}
                    {currentStep === 1 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Step 1: Contact Detail</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Full Name <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Optional)</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="John Doe"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Email <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Optional)</span></label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="john@example.com"
                                        value={patientEmail}
                                        onChange={(e) => setPatientEmail(e.target.value)}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>Provide email for updates on your feedback queries.</p>
                                </div>

                                <button onClick={handleNextStep} className="btn-primary" style={{ marginTop: '1rem' }}>
                                    Next Step →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Category Selection */}
                    {currentStep === 2 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Step 2: Associated Departments</h3>
                            <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '2rem' }}>Please select the areas you had an issue with.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem', justifyContent: 'center' }}>
                                {hospital?.departments.map((dept) => {
                                    const isSelected = selectedCategories.some(c => c.department === dept.name);
                                    return (
                                        <div
                                            key={dept.name}
                                            onClick={() => toggleDepartment(dept)}
                                            style={{
                                                cursor: 'pointer',
                                                borderRadius: '1rem',
                                                border: `2px solid ${isSelected ? '#4F46E5' : '#E5E7EB'}`,
                                                backgroundColor: isSelected ? '#EEF2FF' : 'white',
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                transform: isSelected ? 'scale(1.02)' : 'none',
                                                boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.1)' : 'none'
                                            }}
                                        >
                                            {dept.imageUrl ? (
                                                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '0.5rem' }}>
                                                    <img
                                                        src={dept.imageUrl.startsWith('/') ? `http://localhost:5000${dept.imageUrl}` : dept.imageUrl}
                                                        alt={dept.name}
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ height: '100px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>No Image</div>
                                            )}
                                            <div style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 600, color: isSelected ? '#4F46E5' : '#374151', fontSize: '1rem' }}>{dept.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>{dept.description}</div>
                                            </div>
                                            {isSelected && (
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#4F46E5', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                <button onClick={handlePrevStep} className="btn-outline" style={{ flex: 1 }}>
                                    ← Back
                                </button>
                                <button onClick={handleNextStep} className="btn-primary" style={{ flex: 2 }}>
                                    Continue Details →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Issue Details & Submit */}
                    {currentStep === 3 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Step 3: Provide Specifics</h3>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gap: '2rem' }}>
                                    {selectedCategories.map((cat) => {
                                        // Try to find custom issues from the database first
                                        const dbDept = hospital?.departments?.find(d => d.name === cat.department);
                                        const hasCustomIssues = dbDept?.positiveIssues?.length > 0 || dbDept?.negativeIssues?.length > 0;

                                        const deptData = hasCustomIssues
                                            ? { positive: dbDept.positiveIssues, negative: dbDept.negativeIssues }
                                            : (DEPARTMENT_ISSUES[cat.department] || DEFAULT_ISSUES);

                                        return (
                                            <div key={cat.department} className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #E5E7EB', borderRadius: '1.25rem' }}>
                                                {/* Enhanced Header with properly resized image */}
                                                <div style={{ position: 'relative', width: '100%', height: '200px', background: '#f8fafc', overflow: 'hidden' }}>
                                                    {cat.imageUrl ? (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                                            <img
                                                                src={cat.imageUrl.startsWith('/') ? `http://localhost:5000${cat.imageUrl}` : cat.imageUrl}
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

                                                <div style={{ padding: '2rem' }}>
                                                    {/* Satisfaction Dropdown - Prominent position */}
                                                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                                                        <label className="form-label" style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.75rem', display: 'block' }}>Overall Satisfaction:</label>
                                                        <select
                                                            className="form-control"
                                                            value={cat.rating}
                                                            onChange={(e) => updateRating(cat.department, e.target.value)}
                                                            required
                                                            style={{ padding: '0.875rem', fontSize: '1rem', border: '2px solid #E5E7EB', borderRadius: '0.75rem' }}
                                                        >
                                                            <option value="" disabled>-- Select Satisfaction --</option>
                                                            <option value="Completely Satisfied">Completely Satisfied</option>
                                                            <option value="Partially Satisfied">Partially Satisfied</option>
                                                            <option value="Not Satisfied">Not Satisfied</option>
                                                        </select>
                                                    </div>

                                                    {/* Split Checkboxes: Positive and Negative */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                                                        {/* Positive Reviews */}
                                                        <div>
                                                            <label className="form-label" style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '1.25rem' }}>😊</span> What went well?
                                                            </label>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                {deptData.positive.map(iss => (
                                                                    <label key={iss} style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: '1px solid #E5E7EB',
                                                                        backgroundColor: cat.issue.includes(iss) ? '#D1FAE5' : 'white',
                                                                        color: cat.issue.includes(iss) ? '#064E3B' : '#374151',
                                                                        transition: 'all 0.2s', fontSize: '0.875rem'
                                                                    }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={cat.issue.includes(iss)}
                                                                            onChange={() => toggleIssue(cat.department, iss)}
                                                                        />
                                                                        {iss}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Negative Reviews */}
                                                        <div>
                                                            <label className="form-label" style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '1.25rem' }}>😟</span> Need Improvements?
                                                            </label>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                {deptData.negative.map(iss => (
                                                                    <label key={iss} style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: '1px solid #E5E7EB',
                                                                        backgroundColor: cat.issue.includes(iss) ? '#FEE2E2' : 'white',
                                                                        color: cat.issue.includes(iss) ? '#7F1D1D' : '#374151',
                                                                        transition: 'all 0.2s', fontSize: '0.875rem'
                                                                    }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={cat.issue.includes(iss)}
                                                                            onChange={() => toggleIssue(cat.department, iss)}
                                                                        />
                                                                        {iss}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                                        <div className="form-group">
                                                            <label className="form-label" style={{ fontWeight: 600 }}>Evidence Photo <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Optional)</span></label>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                                <div
                                                                    onClick={() => startCamera(cat.department)}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        border: '2px dashed var(--border)',
                                                                        borderRadius: '0.75rem',
                                                                        padding: '1rem',
                                                                        textAlign: 'center',
                                                                        background: cat.imageFile ? '#ecfdf5' : 'white',
                                                                        borderColor: cat.imageFile ? '#10b981' : 'var(--border)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '0.5rem',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '1.5rem' }}>📸</span>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                                        {cat.imageFile ? 'Photo Ready' : 'Take Photo'}
                                                                    </span>
                                                                </div>

                                                                <label
                                                                    htmlFor={`gallery-upload-${cat.department.replace(/\s+/g, '-')}`}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        border: '2px dashed var(--border)',
                                                                        borderRadius: '0.75rem',
                                                                        padding: '1rem',
                                                                        textAlign: 'center',
                                                                        background: 'white',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '0.5rem',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '1.5rem' }}>🖼️</span>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Gallery</span>
                                                                    <input
                                                                        id={`gallery-upload-${cat.department.replace(/\s+/g, '-')}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => updateImageFile(cat.department, e.target.files[0])}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                </label>
                                                            </div>
                                                            {cat.imageFile && (
                                                                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span>✓ Selected: {cat.imageFile.name}</span>
                                                                    <button type="button" onClick={() => updateImageFile(cat.department, null)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>[Remove]</button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label" style={{ fontWeight: 600 }}>Additional Comments:</label>
                                                            <textarea
                                                                className="form-control"
                                                                rows="3"
                                                                placeholder="Tell us more about your experience..."
                                                                value={cat.customText}
                                                                onChange={(e) => updateCustomText(cat.department, e.target.value)}
                                                                style={{ borderRadius: '0.75rem', padding: '1rem' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>


                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={handlePrevStep} className="btn-outline" style={{ flex: 1 }}>
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={submitting}
                                        style={{ flex: 2, padding: '0.875rem', fontSize: '1.125rem' }}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>

                <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

                {isCameraOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.95)',
                        zIndex: 2000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '640px',
                            aspectRatio: '16/9',
                            background: '#000',
                            borderRadius: '1.5rem',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            border: '2px solid rgba(255,255,255,0.1)'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                                type="button"
                                onClick={stopCamera}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'white',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '900',
                                    color: '#000',
                                    fontSize: '1.2rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>

                            <div style={{
                                position: 'absolute',
                                bottom: '1.5rem',
                                left: 0,
                                right: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                zIndex: 20
                            }}>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    style={{
                                        background: 'var(--primary)',
                                        padding: '1.25rem 2.5rem',
                                        borderRadius: '99px',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.4)',
                                        color: 'white',
                                        border: 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>📸</span> CAPTURE PHOTO
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicFeedback;
