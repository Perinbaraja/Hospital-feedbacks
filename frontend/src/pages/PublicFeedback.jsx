import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';
import toast, { Toaster } from 'react-hot-toast';

const COMMON_ISSUES = {
    'Kitchen': ['Cold Food', 'Late Delivery', 'Poor Taste', 'Unclean Trays'],
    'Cleanliness': ['Dirty Floors', 'Foul Smell', 'Trash Not Emptied', 'Dirty Restrooms'],
    'Staff': ['Rude Behavior', 'Unresponsive', 'Lack of Details provided', 'Too Noisy'],
    'Environment': ['Room Too Cold', 'Room Too Hot', 'Loud Neighbors', 'Broken Lights']
};

const PublicFeedback = () => {
    const { hospitalId } = useParams();
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
                const { data } = await API.get('/hospital');
                setHospital(data);
            } catch (error) {
                toast.error('Failed to load feedback form configuration.');
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const toggleDepartment = (dept) => {
        const exists = selectedCategories.find(c => c.department === dept);
        if (exists) {
            setSelectedCategories(selectedCategories.filter(c => c.department !== dept));
        } else {
            setSelectedCategories([...selectedCategories, { department: dept, issue: '', customText: '' }]);
        }
    };

    const updateIssue = (dept, issue) => {
        setSelectedCategories(prev => prev.map(c => {
            if (c.department === dept) {
                return { ...c, issue, customText: issue === 'Others' ? c.customText : '' };
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

        const missingRequiredSelections = selectedCategories.find(c => !c.issue || (c.issue === 'Others' && !c.customText.trim()));
        if (missingRequiredSelections) {
            toast.error('Please complete your selections for all chosen departments.');
            setSubmitting(false);
            return;
        }

        try {
            await API.post('/feedback', {
                patientName,
                patientEmail,
                categories: selectedCategories,
                comments
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
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
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
            <Toaster />
            <div className="card" style={{ padding: '2.5rem' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    {hospital?.logoUrl && (
                        <img src={hospital.logoUrl} alt="Hospital Logo" style={{ height: '80px', objectFit: 'contain', marginBottom: '1rem' }} />
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

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                            {hospital?.departments.map((dept) => {
                                const isSelected = selectedCategories.some(c => c.department === dept);
                                return (
                                    <button
                                        key={dept}
                                        type="button"
                                        onClick={() => toggleDepartment(dept)}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '9999px',
                                            border: `2px solid ${isSelected ? '#4F46E5' : '#E5E7EB'}`,
                                            backgroundColor: isSelected ? '#EEF2FF' : 'transparent',
                                            color: isSelected ? '#4F46E5' : '#374151',
                                            fontWeight: 500,
                                            fontSize: '1rem',
                                            transition: 'var(--transitions)'
                                        }}
                                    >
                                        {dept}
                                    </button>
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

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {selectedCategories.map((cat) => {
                                    const subIssues = COMMON_ISSUES[cat.department] || ['Service Quality', 'Maintenance', 'Staff Attitude', 'Delays'];
                                    return (
                                        <div key={cat.department} style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                                            <h4 style={{ color: '#374151', fontSize: '1rem', marginBottom: '0.75rem' }}>Issues experienced inside: <b>{cat.department}</b></h4>

                                            <select
                                                className="form-control"
                                                value={cat.issue}
                                                onChange={(e) => updateIssue(cat.department, e.target.value)}
                                                style={{ marginBottom: '1rem' }}
                                                required
                                            >
                                                <option value="" disabled>-- Select an Issue --</option>
                                                {subIssues.map(iss => <option key={iss} value={iss}>{iss}</option>)}
                                                <option value="Others">Others</option>
                                            </select>

                                            {cat.issue === 'Others' && (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Please describe the issue..."
                                                    value={cat.customText}
                                                    onChange={(e) => updateCustomText(cat.department, e.target.value)}
                                                    required
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label">Additional Comments <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Optional)</span></label>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    placeholder="Tell us more about your overall experience..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                ></textarea>
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
        </div>
    );
};

export default PublicFeedback;
